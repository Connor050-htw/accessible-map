/**
 * 3D Mode Feature Module
 * Handles toggling 3D view with Mapbox GL and switching styles
 */

import { MAPBOX_TOKEN, MAPTILER_KEY, JAWG_ACCESS_TOKEN } from '../core/config.js';
import { baseMaps, getGLMapFromLayer } from '../layers/basemaps.js';
import { add3DBuildings, remove3DBuildings } from '../layers/3d-buildings.js';
import { hidePOIMarkers, showPOIMarkers } from '../layers/poi-markers.js';
import { applyLOD } from './lod-control.js';

// State management
let buildings3DEnabled = false;
let currentBasemap = null;
let savedCameraState = null; // Store camera state for basemap changes

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
    
    try {
        // Find active basemap (now all are GL-based)
        for (const [name, baseLayer] of Object.entries(baseMaps)) {
            if (map.hasLayer(baseLayer)) {
                currentBasemap = baseLayer;
                console.log('Active basemap:', name);
                break;
            }
        }
        
        if (!currentBasemap) {
            console.error('No active basemap found');
            return false;
        }
        
        // Get the GL map from the basemap layer
        const glMap = getGLMapFromLayer(currentBasemap);
        if (!glMap) {
            console.error('Could not access GL map from basemap');
            return false;
        }
        
        // Hide POI markers and labels in 3D mode
        hidePOIMarkers(map);
        
        // Enable 3D controls on existing GL layer
        glMap.dragRotate.enable();
        glMap.touchPitch.enable();
        
        // Wait for style to be loaded before adding 3D buildings
        const add3DWhenReady = () => {
            if (glMap.isStyleLoaded()) {
                console.log('Adding 3D buildings...');
                add3DBuildings(glMap);
            } else {
                glMap.once('idle', () => {
                    console.log('Style ready, adding 3D buildings...');
                    add3DBuildings(glMap);
                });
            }
        };
        
        add3DWhenReady();
        
        // Zoom to appropriate level for 3D buildings
        if (map.getZoom() < 15) {
            console.log('Zooming to level 15 for 3D buildings');
            map.setZoom(15);
        }
        
        // Show compass with map reference
        if (showCompass) showCompass(map);
        
        return true;
    } catch (error) {
        console.error('Error enabling 3D mode:', error);
        alert('3D mode could not be enabled: ' + error.message);
        buildings3DEnabled = false;
        return false;
    }
}

/**
 * Disable 3D mode
 * @param {L.Map} map - Leaflet map instance
 * @param {Function} hideCompass - Callback to hide compass
 */
export function disable3DMode(map, hideCompass) {
    buildings3DEnabled = false;
    console.log('3D View disabled');
    
    try {
        // Remove 3D from ALL basemap layers, not just the current one
        for (const [name, baseLayer] of Object.entries(baseMaps)) {
            const glMap = getGLMapFromLayer(baseLayer);
            if (glMap) {
                // Remove 3D buildings layer
                remove3DBuildings(glMap);
                
                // Reset to 2D view
                glMap.setPitch(0);
                glMap.setBearing(0);
                glMap.dragRotate.disable();
                glMap.touchPitch.disable();
                
                console.log(`3D disabled for layer: ${name}`);
            }
        }
        
        console.log('3D controls disabled for all layers, map reset to 2D');
        
        // Show POI markers and labels again
        showPOIMarkers(map);
        
        // Hide compass
        if (hideCompass) hideCompass();
        
    } catch (error) {
        console.error('Error disabling 3D mode:', error);
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
    if (!buildings3DEnabled) return;
    
    try {
        // Save camera state from OLD basemap before switching
        if (currentBasemap) {
            const oldGlMap = getGLMapFromLayer(currentBasemap);
            if (oldGlMap) {
                savedCameraState = {
                    pitch: oldGlMap.getPitch(),
                    bearing: oldGlMap.getBearing(),
                    zoom: oldGlMap.getZoom(),
                    center: oldGlMap.getCenter()
                };
                console.log('Saved camera state:', savedCameraState);
            }
        }
        
        // Update current basemap reference
        currentBasemap = event.layer;
        
        // Get GL map from new basemap
        const glMap = getGLMapFromLayer(currentBasemap);
        if (!glMap) {
            console.error('Could not access GL map from new basemap');
            return;
        }
        
        console.log('Basemap changed in 3D mode');
        
        // Wait for new style to load, then re-add 3D buildings and restore camera
        const onStyleLoad = () => {
            try {
                // Restore camera position FIRST (before adding buildings)
                if (savedCameraState) {
                    glMap.jumpTo({
                        center: savedCameraState.center,
                        zoom: savedCameraState.zoom,
                        bearing: savedCameraState.bearing,
                        pitch: savedCameraState.pitch
                    });
                    console.log('Camera state restored:', savedCameraState);
                }
                
                // Then add 3D buildings (without resetting camera)
                add3DBuildings(glMap, false);
                
                // Re-enable 3D controls
                glMap.dragRotate.enable();
                glMap.touchPitch.enable();
                
                // Hide POI markers in 3D mode
                hidePOIMarkers(event.target);
                
                // Reapply current LOD level
                const lodSlider = document.getElementById('lod-range');
                if (lodSlider) {
                    const currentLevel = parseInt(lodSlider.value);
                    applyLOD(currentLevel, event.target);
                }
                
                console.log('3D buildings and camera restored after basemap change');
            } catch (err) {
                console.error('Error restoring 3D after basemap change:', err);
            }
        };
        
        if (glMap.isStyleLoaded()) {
            onStyleLoad();
        } else {
            glMap.once('idle', onStyleLoad);
        }
        
    } catch (err) {
        console.error('Basemap switch in 3D mode failed:', err);
    }
}
