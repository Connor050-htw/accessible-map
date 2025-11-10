/**
 * LOD (Level of Detail) Control - Vector Tiles Edition
 * - Provides a slider to adjust visual detail by controlling GL layers
 * - Leverages automatic geometric simplification from vector tile server
 *   (at low zoom levels, boundaries are automatically simplified with fewer geometry points)
 * - Manual slider levels:
 *   0 = Low (only country borders visible)
 *   1 = Medium (country + state borders, more roads, major labels)
 *   2 = High (full details - all boundaries, roads, labels)
 * - Geometric simplification happens automatically via vector tiles:
 *   Zoom 0-3: Countries are simple shapes (e.g., Germany ≈ oval/circle)
 *   Zoom 4-6: More detailed shapes with major features
 *   Zoom 7+: Full geometric detail with all coastline/border details
 * - POI markers are always visible (not controlled by LOD)
 * - LOD level is persisted in LocalStorage and restored on reload
 * - LOD is automatically reapplied when changing basemap layers
 * - Works for all vector basemaps (2D and 3D)
 */

import { is3DModeEnabled } from './3d-mode.js';
import { showPOIMarkers } from '../layers/poi-markers.js';
import { getGLMapFromLayer, baseMaps } from '../layers/basemaps.js';

let currentLevel = 2;
let lastAppliedLevel = 2;
let currentMap = null;

// LocalStorage key for persistence
const LOD_STORAGE_KEY = 'accessible-map-lod-level';

// Cache of original layer properties to restore at full detail
const originalLayerProps = new Map(); // key: layerId, value: { visibility, opacity, ... }

/**
 * Get the active Mapbox GL map instance (from basemap or 3D layer)
 * @param {L.Map} map - Leaflet map
 * @returns {mapboxgl.Map|null}
 */
function getActiveGLMap(map) {
    // Find the active basemap layer
    for (const [name, baseLayer] of Object.entries(baseMaps)) {
        if (map.hasLayer(baseLayer)) {
            return getGLMapFromLayer(baseLayer);
        }
    }
    return null;
}

/**
 * Apply LOD settings to Mapbox GL layers
 * @param {number} level - LOD level (0-2)
 * @param {mapboxgl.Map} glMap - Mapbox GL map instance
 */
function applyVectorLOD(level, glMap) {
    if (!glMap || !glMap.isStyleLoaded()) {
        // Retry when style is ready
        if (glMap) {
            glMap.once('idle', () => applyVectorLOD(level, glMap));
        }
        return;
    }

    try {
        const style = glMap.getStyle();
        if (!style || !style.layers) return;

        // Get current zoom level for zoom-based simplification
        const zoom = glMap.getZoom();

        style.layers.forEach(layer => {
            const layerId = layer.id;

            // Cache original layer properties for restoration at full detail level
            if (!originalLayerProps.has(layerId)) {
                const vis = glMap.getLayoutProperty(layerId, 'visibility') || 'visible';
                let opacity = 1.0;
                try {
                    if (layer.type === 'line') {
                        opacity = glMap.getPaintProperty(layerId, 'line-opacity') ?? 1.0;
                    } else if (layer.type === 'fill') {
                        opacity = glMap.getPaintProperty(layerId, 'fill-opacity') ?? 1.0;
                    } else if (layer.type === 'symbol') {
                        opacity = glMap.getPaintProperty(layerId, 'text-opacity') ?? 1.0;
                    }
                } catch {}
                originalLayerProps.set(layerId, { visibility: vis, opacity });
            }

            // Symbol layers: labels and icons
            // Level 0: Hide all | Level 1: Major only | Level 2: Show all
            if (layer.type === 'symbol') {
                try {
                    if (level === 0) {
                        glMap.setLayoutProperty(layerId, 'visibility', 'none');
                    } else if (level === 1) {
                        // Only show major geographic features (countries, states, major cities)
                        if (/country|state|province|capital|city/i.test(layerId) && !/minor|neighbourhood|hamlet/i.test(layerId)) {
                            glMap.setLayoutProperty(layerId, 'visibility', 'visible');
                        } else {
                            glMap.setLayoutProperty(layerId, 'visibility', 'none');
                        }
                    } else {
                        const orig = originalLayerProps.get(layerId);
                        glMap.setLayoutProperty(layerId, 'visibility', orig?.visibility || 'visible');
                    }
                } catch (e) {
                    console.debug(`Could not adjust symbol layer ${layerId}:`, e.message);
                }
            }

            // Administrative boundaries (borders)
            // Dynamically adjust visibility based on admin level and current zoom
            if (layer.type === 'line' && /(admin|boundary)/i.test(layerId)) {
                try {
                    // Detect admin level from layer ID (e.g., admin-0, admin-1, admin-2)
                    const adminMatch = layerId.match(/admin[-_]?(\d+)/i);
                    const adminLevel = adminMatch ? parseInt(adminMatch[1]) : 99;
                    const isCountry = adminLevel === 0 || /country/i.test(layerId);

                    // Vector tiles automatically provide simplified geometries at lower zoom levels
                    // We just control visibility based on LOD level and admin level
                    
                    if (level === 0) {
                        // Low: Only show country borders
                        if (isCountry) {
                            glMap.setLayoutProperty(layerId, 'visibility', 'visible');
                        } else {
                            glMap.setLayoutProperty(layerId, 'visibility', 'none');
                        }
                    } else if (level === 1) {
                        // Medium: More administrative levels
                        if (adminLevel <= 2 || isCountry) {
                            glMap.setLayoutProperty(layerId, 'visibility', 'visible');
                        } else {
                            glMap.setLayoutProperty(layerId, 'visibility', 'none');
                        }
                    } else {
                        // High: All boundaries
                        const orig = originalLayerProps.get(layerId);
                        glMap.setLayoutProperty(layerId, 'visibility', orig?.visibility || 'visible');
                    }
                    
                } catch (e) {
                    console.debug(`Could not adjust boundary layer ${layerId}:`, e.message);
                }
            }

            // === Roads ===
            {
                const sourceLayer = layer['source-layer'] || layer.sourceLayer || '';
                const isRoadLayer = layer.type === 'line' && (/(road|street|transportation|bridge|tunnel)/i.test(layerId) || /(transportation|road|highway)/i.test(sourceLayer));
                if (isRoadLayer) {
                    try {
                        // Be conservative with classification to avoid inversions on specific styles (e.g., HOT)
                        // Do NOT use generic 'highway' as motorway indicator as some styles include it in many IDs
                        const filterStr = Array.isArray(layer.filter) ? JSON.stringify(layer.filter) : '';
                        const isMotorway = /(motorway|trunk|freeway|expressway)/i.test(layerId) || /(motorway|trunk|freeway|expressway)/i.test(filterStr);
                        const isMinor = /(minor|service|tertiary|residential|living|track)/i.test(layerId) || /(minor|service|tertiary|residential|living|track)/i.test(filterStr) || /transportation_minor/i.test(layerId);

                        if (level === 0) {
                            // Low: Only motorways/trunk
                            glMap.setLayoutProperty(layerId, 'visibility', isMotorway ? 'visible' : 'none');
                        } else if (level === 1) {
                            // Medium: Hide only minor roads; default to visible when unknown to avoid over-hiding
                            if (isMinor) {
                                glMap.setLayoutProperty(layerId, 'visibility', 'none');
                            } else {
                                glMap.setLayoutProperty(layerId, 'visibility', 'visible');
                            }
                        } else {
                            // High: All roads (restore original)
                            const orig = originalLayerProps.get(layerId);
                            glMap.setLayoutProperty(layerId, 'visibility', orig?.visibility || 'visible');
                        }
                    } catch (e) {
                        console.debug(`Could not adjust road layer ${layerId}:`, e.message);
                    }
                }
            }
        });

        console.log(`Vector LOD level ${level} applied`);
    } catch (e) {
        console.error('Error applying vector LOD:', e);
    }
}

/**
 * Apply LOD to POI markers (Leaflet overlays)
 * POIs are always visible regardless of LOD level, EXCEPT in 3D mode
 * @param {number} level - LOD level
 * @param {L.Map} map - Leaflet map
 */
function applyPOILOD(level, map) {
    // Don't show POIs in 3D mode - they should remain hidden
    if (is3DModeEnabled()) {
        return;
    }
    
    // POIs always visible in 2D mode - no changes based on LOD level
    showPOIMarkers(map);
    // Labels always visible in 2D mode
    document.querySelectorAll('.label').forEach(el => { 
        el.style.display = ''; 
    });
}

/**
 * Main LOD application function
 * @param {number} level - LOD level (0-2)
 * @param {L.Map} map - Leaflet map
 */
export function applyLOD(level, map) {
    currentLevel = level;
    currentMap = map;

    // Save to LocalStorage
    try {
        localStorage.setItem(LOD_STORAGE_KEY, String(level));
    } catch (e) {
        console.warn('Could not save LOD level to LocalStorage:', e);
    }

    // Apply to vector layers
    const glMap = getActiveGLMap(map);
    if (glMap) {
        applyVectorLOD(level, glMap);
    }

    // Apply to POI markers
    applyPOILOD(level, map);

    lastAppliedLevel = level;
}

/**
 * Initialize LOD control slider
 * @param {L.Map} map - Leaflet map
 */
export function initializeLODControl(map) {
    const slider = document.getElementById('lod-range');
    if (!slider) return;

    // Load saved LOD level from LocalStorage
    let initialLevel = 2; // Default to High
    try {
        const saved = localStorage.getItem(LOD_STORAGE_KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (parsed >= 0 && parsed <= 2) {
                initialLevel = parsed;
            }
        }
    } catch (e) {
        console.warn('Could not load LOD level from LocalStorage:', e);
    }

    // Set slider to saved value
    slider.value = String(initialLevel);

    const updateA11y = () => {
        slider.setAttribute('aria-valuenow', String(slider.value));
    };

    const onChange = () => {
        const lvl = parseInt(slider.value, 10);
        applyLOD(lvl, map);
        updateA11y();
    };

    slider.addEventListener('input', onChange);
    slider.addEventListener('change', onChange);

    // Re-apply LOD when zooming to adjust detail based on zoom level
    // Debounce slightly to avoid flicker during rapid zoom interactions
    let zoomDebounce;
    map.on('zoomend', () => {
        if (zoomDebounce) clearTimeout(zoomDebounce);
        zoomDebounce = setTimeout(() => applyLOD(currentLevel, map), 50);
    });

    // Re-apply LOD when basemap changes
    map.on('baselayerchange', () => {
        console.log('Basemap changed, reapplying LOD level:', currentLevel);
        // Delay to ensure new layer is ready
        setTimeout(() => {
            applyLOD(currentLevel, map);
        }, 500);
    });

    // Apply initial level
    applyLOD(initialLevel, map);
    updateA11y();

    console.log('LOD control initialized (vector mode, zoom-aware, persistent)');
}
