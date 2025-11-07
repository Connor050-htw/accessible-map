/**
 * LOD (Level of Detail) Control
 * - Provides a slider to adjust visual detail in 2D and 3D modes
 * - 0 = minimal, 1 = low, 2 = medium, 3 = full
 */

import { is3DModeEnabled, getMapboxGLMap, registerLODReapplyCallback } from './3d-mode.js';
import { hidePOIMarkers, showPOIMarkers } from '../layers/poi-markers.js';
import { baseMaps, lodBasemapMap, lodExtraLayers } from '../layers/basemaps.js';

let currentLevel = 3;
let lastAppliedLevel = 3;

// Cache of original Mapbox GL layer visibilities to restore later
const originalVisibility = new Map(); // key: layerId, value: visibility

function switchBasemapForLOD(level, map) {
    // Determine target style
    const key = lodBasemapMap[level];
    let targetLayer = null;
    if (key && baseMaps[key]) {
        targetLayer = baseMaps[key];
    } else if (key && lodExtraLayers[key]) {
        targetLayer = lodExtraLayers[key];
    }
    if (!targetLayer) return; // fallback do nothing

    // Find current basemap (any tile layer present from baseMaps/lodExtraLayers)
    let currentBaseLayer = null;
    map.eachLayer(l => {
        if (l instanceof L.TileLayer) currentBaseLayer = l;
    });

    if (currentBaseLayer === targetLayer) return; // already correct

    // Remove existing tile layers
    map.eachLayer(l => { if (l instanceof L.TileLayer) map.removeLayer(l); });
    // Add target
    targetLayer.addTo(map);
}

function applyLOD2D(level, map) {
    switchBasemapForLOD(level, map);

    // Control POI density (no visual filter modifications)
    if (level === 0) {
        hidePOIMarkers(map);
    } else if (level === 1) {
        showPOIMarkers(map);
        document.querySelectorAll('.label').forEach(el => { el.style.display = 'none'; });
    } else if (level === 2) {
        showPOIMarkers(map);
        document.querySelectorAll('.label').forEach(el => { el.style.display = 'none'; });
    } else {
        showPOIMarkers(map);
        document.querySelectorAll('.label').forEach(el => { el.style.display = ''; });
    }
}

function applyLOD3D(level) {
    const gl = getMapboxGLMap();
    if (!gl) return;

    const ensureApplied = () => {
        try {
            const style = gl.getStyle();
            if (!style || !style.layers) return;

            // Iterate layers and toggle symbol layers (labels/icons) based on level
            style.layers.forEach(l => {
                if (l.type === 'symbol') {
                    const currentVis = (gl.getLayoutProperty(l.id, 'visibility') || 'visible');
                    if (!originalVisibility.has(l.id)) originalVisibility.set(l.id, currentVis);
                    if (level <= 1) {
                        gl.setLayoutProperty(l.id, 'visibility', 'none');
                    } else if (level >= 2) {
                        const orig = originalVisibility.get(l.id) || 'visible';
                        gl.setLayoutProperty(l.id, 'visibility', orig);
                    }
                }
                // Remove fading logic (user requested no visual weakening); only hide labels at low LOD
            });
        } catch (e) {
            // ignore style transition issues
        }
    };

    if (!gl.isStyleLoaded()) {
        gl.once('idle', ensureApplied);
    } else {
        ensureApplied();
    }
}

export function applyLOD(level, map) {
    currentLevel = level;
    if (is3DModeEnabled()) {
        applyLOD3D(level);
    } else {
        applyLOD2D(level, map);
    }
    lastAppliedLevel = level;
}

export function initializeLODControl(map) {
    const slider = document.getElementById('lod-range');
    if (!slider) return;

    // Register callback to reapply LOD after 3D style changes
    registerLODReapplyCallback(() => applyLOD(lastAppliedLevel, map));

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

    // Apply initial level
    applyLOD(parseInt(slider.value, 10), map);
    updateA11y();
}
