/**
 * 3D Mode Feature Module
 * Handles toggling 3D view with Mapbox GL and switching styles
 */

import { MAPBOX_TOKEN, MAPTILER_KEY, JAWG_ACCESS_TOKEN } from '../core/config.js';
import { baseMaps } from '../layers/basemaps.js';
import { add3DBuildings } from '../layers/3d-buildings.js';
import { hidePOIMarkers, showPOIMarkers } from '../layers/poi-markers.js';

// State management
let mapbox3DLayer = null;
let buildings3DEnabled = false;
let originalBasemap = null;
let currentBasemapName = null;
// Exported LOD callback (set by lod.js) to reapply after style switches
let _reapplyLOD = null;

/**
 * Map Leaflet basemap names to Mapbox GL style URLs
 * @param {string} name - Basemap name
 * @returns {string} Mapbox GL style URL
 */
function get3DStyleForBasemap(name) {
    const mapboxLight = 'mapbox://styles/mapbox/light-v11';
    const mapboxStreets = 'mapbox://styles/mapbox/streets-v12';
    const mapboxDark = 'mapbox://styles/mapbox/dark-v11';

    if (!name) return mapboxStreets;

    switch (name) {
        case 'MapTiler Toner':
            return `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`;
        case 'MapTiler Dataviz':
            return `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`;
        case 'Jawg Dark':
            return `https://api.jawg.io/styles/jawg-dark.json?access-token=${JAWG_ACCESS_TOKEN}`;
        case 'Jawg Light':
            return `https://api.jawg.io/styles/jawg-light.json?access-token=${JAWG_ACCESS_TOKEN}`;
        case 'OpenStreetMap.HOT':
            return `https://api.maptiler.com/maps/bright/style.json?key=${MAPTILER_KEY}`;
        case 'OpenStreetMap':
            return `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`;
        default:
            return mapboxStreets;
    }
}

/**
 * Enable 3D mode
 * @param {L.Map} map - Leaflet map instance
 * @param {Function} showCompass - Callback to show compass
 * @returns {boolean} Success status
 */
export function enable3DMode(map, showCompass) {
    console.log('3D View enabled - Zoom Level:', map.getZoom());
    
    // Check if token is set
    if (MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
        alert('Please set your Mapbox Access Token in mapbox-config.js.\n\nAvailable for free at: https://account.mapbox.com/');
        return false;
    }
    
    buildings3DEnabled = true;
    
    if (!mapbox3DLayer) {
        try {
            // Set access token
            mapboxgl.accessToken = MAPBOX_TOKEN;
            
            const zoom = Math.max(map.getZoom(), 15);
            
            // Determine current basemap BEFORE removing it
            originalBasemap = null;
            currentBasemapName = null;
            for (const [name, baseLayer] of Object.entries(baseMaps)) {
                if (map.hasLayer(baseLayer)) {
                    originalBasemap = baseLayer;
                    currentBasemapName = name;
                    break;
                }
            }
            console.log('Active basemap before 3D:', currentBasemapName);

            // Remove all Leaflet tile layers
            map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer) {
                    map.removeLayer(layer);
                }
            });
            console.log('Leaflet basemap removed');
            
            // Hide POI markers and labels in 3D mode
            hidePOIMarkers(map);
            
            // Create Mapbox GL layer
            mapbox3DLayer = L.mapboxGL({
                accessToken: MAPBOX_TOKEN,
                style: get3DStyleForBasemap(currentBasemapName),
                pane: 'tilePane',
                interactive: true,
                dragRotate: true,
                pitchWithRotate: true,
                touchPitch: true,
                touchZoomRotate: true,
                updateInterval: 16, // 60fps
                bearingSnap: 7,
                renderWorldCopies: false,
                preserveDrawingBuffer: true,
                pitchWithRotate: true,
                dragPan: true,
                fadeDuration: 0,
                crossSourceCollisions: false
            }).addTo(map);
            
            console.log('Mapbox 3D Layer added');
            
            // Wait for the mapbox map to be ready
            setTimeout(() => {
                try {
                    const mapboxMap = mapbox3DLayer.getMapboxMap();
                    
                    if (mapboxMap && mapboxMap.isStyleLoaded()) {
                        console.log('Mapbox Style loaded, adding 3D buildings...');
                        add3DBuildings(mapboxMap);
                    } else {
                        const onIdle = () => {
                            console.log('Mapbox Style ready (idle), adding 3D buildings...');
                            add3DBuildings(mapboxMap);
                        };
                        mapboxMap.once('idle', onIdle);
                    }
                } catch (e) {
                    console.error('Error accessing Mapbox Map:', e);
                }
            }, 1000);
            
            // Zoom to appropriate level
            if (map.getZoom() < 15) {
                console.log('Zooming to level 15 for 3D buildings');
                map.setZoom(15);
            }
            
            // Show compass
            if (showCompass) showCompass();
            
            return true;
        } catch (error) {
            console.error('Error loading Mapbox 3D:', error);
            alert('3D buildings could not be loaded: ' + error.message);
            buildings3DEnabled = false;
            return false;
        }
    }
    return true;
}

/**
 * Disable 3D mode
 * @param {L.Map} map - Leaflet map instance
 * @param {Function} hideCompass - Callback to hide compass
 */
export function disable3DMode(map, hideCompass) {
    buildings3DEnabled = false;
    console.log('3D View disabled');
    
    if (mapbox3DLayer) {
        try {
            map.removeLayer(mapbox3DLayer);
            mapbox3DLayer = null;
            console.log('Mapbox 3D Layer removed');
            
            // Restore original basemap
            if (originalBasemap) {
                originalBasemap.addTo(map);
                console.log('Leaflet Basemap restored:', currentBasemapName);
            } else if (currentBasemapName && baseMaps[currentBasemapName]) {
                baseMaps[currentBasemapName].addTo(map);
                console.log('Leaflet Basemap restored by name:', currentBasemapName);
            } else {
                // Default fallback
                baseMaps['Jawg Light'].addTo(map);
                console.log('Default Basemap restored');
            }
            
            // Show POI markers and labels again
            showPOIMarkers(map);
            
            // Trigger layer control update
            map.fire('baselayerchange', { layer: originalBasemap || baseMaps['Jawg Light'] });
            
            // Hide compass
            if (hideCompass) hideCompass();
            
        } catch (error) {
            console.error('Error removing Mapbox 3D:', error);
        }
    }
}

/**
 * Check if 3D mode is currently enabled
 * @returns {boolean}
 */
export function is3DModeEnabled() {
    return buildings3DEnabled;
}

/**
 * Handle basemap change while in 3D mode
 * @param {Object} event - Leaflet baselayerchange event
 */
export function handle3DBasemapChange(event) {
    if (!buildings3DEnabled || !mapbox3DLayer) return;
    
    try {
        // Determine basemap name by matching the layer object
        const getBasemapNameByLayer = (layerObj) => {
            for (const [name, lyr] of Object.entries(baseMaps)) {
                if (lyr === layerObj) return name;
            }
            return null;
        };

        const newName = getBasemapNameByLayer(event.layer);
        if (newName) {
            currentBasemapName = newName;
            originalBasemap = null;
            
            // Remove the Leaflet tile layer that was just activated by the control
            if (event.layer._map) {
                event.layer._map.removeLayer(event.layer);
            }

            // Update GL style to match the new basemap
            const glMap = (typeof mapbox3DLayer.getMapboxMap === 'function') 
                ? mapbox3DLayer.getMapboxMap() 
                : mapbox3DLayer._glMap;
            const newStyle = get3DStyleForBasemap(currentBasemapName);
            
            if (glMap && newStyle) {
                // Save current camera position
                const currentPitch = glMap.getPitch();
                const currentBearing = glMap.getBearing();
                const currentZoom = glMap.getZoom();
                const currentCenter = glMap.getCenter();
                
                glMap.setStyle(newStyle);
                const onIdle = () => {
                    try {
                        add3DBuildings(glMap);
                        // Restore camera position after style change
                        glMap.setPitch(currentPitch);
                        glMap.setBearing(currentBearing);
                        glMap.setZoom(currentZoom);
                        glMap.setCenter(currentCenter);
                        // Reapply LOD adjustments if provided
                        if (typeof _reapplyLOD === 'function') {
                            _reapplyLOD();
                        }
                    } catch (err) {
                        console.error('Error adding 3D buildings after style switch:', err);
                    }
                };
                glMap.once('idle', onIdle);
            }
        }
    } catch (err) {
        console.error('Basemap switch in 3D mode failed:', err);
    }
}

/**
 * Get underlying Mapbox GL Map instance (if 3D active)
 * @returns {import('mapbox-gl').Map|null}
 */
export function getMapboxGLMap() {
    if (!mapbox3DLayer) return null;
    try {
        return (typeof mapbox3DLayer.getMapboxMap === 'function') ? mapbox3DLayer.getMapboxMap() : mapbox3DLayer._glMap || null;
    } catch {
        return null;
    }
}

/**
 * Allow LOD module to register a callback to reapply its state after style changes.
 * @param {Function} fn
 */
export function registerLODReapplyCallback(fn) {
    _reapplyLOD = fn;
}
