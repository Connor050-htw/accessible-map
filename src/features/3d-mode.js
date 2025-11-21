/**
 * 3D Mode Feature Module
 * Handles toggling 3D view with Mapbox GL and switching styles
 */

import { MAPBOX_TOKEN, MAPTILER_KEY, JAWG_ACCESS_TOKEN } from '../core/config.js';
import { baseMaps, getGLMapFromLayer } from '../layers/basemaps.js';
import { add3DBuildings, remove3DBuildings } from '../layers/3d-buildings.js';
import { applyLabelVisibilityFromSetting } from './settings.js';
import { hidePOIMarkers, showPOIMarkers } from '../layers/poi-markers.js';
import { applyLOD } from './lod-control.js';

// State management
let buildings3DEnabled = false;
let currentBasemap = null;
let savedCameraState = null; // Store camera state for basemap changes
let keyboardHandler = null; // Document-level Shift+Arrow handler for 3D
// Use Shift key as modifier for touch/remote control (no V-key replacement needed)
let pointerHandlers = null; // store pointer handlers so we can remove them

function getCurrentGLMap() {
    try {
        return currentBasemap && (typeof currentBasemap.getMapboxMap === 'function'
            ? currentBasemap.getMapboxMap()
            : currentBasemap._glMap || null);
    } catch {
        return null;
    }
}

function attach3DKeyboardHandler() {
    if (keyboardHandler) return; // already attached
    keyboardHandler = (event) => {
        // allow control when 3D is enabled and one of the modifier keys is active:
        // Shift or Alt
        if (!buildings3DEnabled || !(event.shiftKey || event.altKey)) return;
        const tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || (event.target && event.target.isContentEditable)) return;
        const glMap = getCurrentGLMap();
        if (!glMap) return;

        const bearingStep = 5; // degrees per key press
        const pitchStep = 5;   // degrees per key press
        const key = event.key;
        let handled = false;

        if (key === 'ArrowLeft') {
            glMap.setBearing(glMap.getBearing() - bearingStep);
            handled = true;
        } else if (key === 'ArrowRight') {
            glMap.setBearing(glMap.getBearing() + bearingStep);
            handled = true;
        } else if (key === 'ArrowUp') {
            const nextPitch = Math.min(85, glMap.getPitch() + pitchStep);
            glMap.setPitch(nextPitch);
            handled = true;
        } else if (key === 'ArrowDown') {
            const nextPitch = Math.max(0, glMap.getPitch() - pitchStep);
            glMap.setPitch(nextPitch);
            handled = true;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    document.addEventListener('keydown', keyboardHandler, true);
}

function detach3DKeyboardHandler() {
    if (!keyboardHandler) return;
    document.removeEventListener('keydown', keyboardHandler, true);
    keyboardHandler = null;
}

// Shift key is read from event.shiftKey directly; no extra listeners required

function attach3DPointerHandlers(glMap) {
    if (!glMap || pointerHandlers) return;
    const container = glMap.getCanvasContainer();
    let rotating = false;
    let last = null;
    let pointerId = null;
    const rotateSensitivity = 0.2; // degrees per pixel horizontally
    const tiltSensitivity = 0.12;   // degrees per pixel vertically

    const onDown = (ev) => {
        // Only start our custom rotate/tilt when the user explicitly requests it:
        // Require a modifier: Shift or Alt. Without modifier, allow normal panning.
        const hasModifier = ev.shiftKey || ev.altKey;
        if (!hasModifier) return; // no modifier -> let the map pan normally
        rotating = true;
        last = { x: ev.clientX, y: ev.clientY };
        pointerId = ev.pointerId;
        try { container.setPointerCapture(pointerId); } catch (e) {}
        // prevent default dragging while we control rotation
        ev.preventDefault();
    };

    const onMove = (ev) => {
        if (!rotating || pointerId !== ev.pointerId || !last) return;
        const dx = ev.clientX - last.x;
        const dy = ev.clientY - last.y;
        last = { x: ev.clientX, y: ev.clientY };

        // Update bearing and pitch directly
        try {
            const currentBearing = glMap.getBearing();
            const currentPitch = glMap.getPitch();
            const newBearing = (currentBearing + dx * rotateSensitivity) % 360;
            let newPitch = currentPitch - dy * tiltSensitivity;
            if (newPitch < 0) newPitch = 0;
            if (newPitch > 85) newPitch = 85;
            // Use jumpTo / set methods to avoid interfering with other map interactions
            glMap.setBearing(newBearing);
            glMap.setPitch(newPitch);
        } catch (err) {
            // some GL map implementations use different method names; ignore errors
            console.error('Pointer rotate/tilt error:', err);
        }
        ev.preventDefault();
    };

    const onUp = (ev) => {
        if (!rotating || pointerId !== ev.pointerId) return;
        rotating = false;
        last = null;
        try { container.releasePointerCapture(ev.pointerId); } catch (e) {}
        pointerId = null;
        ev.preventDefault();
    };

    container.addEventListener('pointerdown', onDown, { passive: false });
    container.addEventListener('pointermove', onMove, { passive: false });
    container.addEventListener('pointerup', onUp, { passive: false });
    container.addEventListener('pointercancel', onUp, { passive: false });

    pointerHandlers = { onDown, onMove, onUp };
}

function detach3DPointerHandlers() {
    if (!pointerHandlers) return;
    try {
        // remove from current basemap(s) canvas containers
        for (const baseLayer of Object.values(baseMaps)) {
            const gl = getGLMapFromLayer(baseLayer);
            if (gl) {
                const c = gl.getCanvasContainer();
                c.removeEventListener('pointerdown', pointerHandlers.onDown);
                c.removeEventListener('pointermove', pointerHandlers.onMove);
                c.removeEventListener('pointerup', pointerHandlers.onUp);
                c.removeEventListener('pointercancel', pointerHandlers.onUp);
            }
        }
    } catch (e) {
        console.warn('Error detaching pointer handlers', e);
    }
    pointerHandlers = null;
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
                attach3DKeyboardHandler();
                attach3DPointerHandlers(glMap);
            } else {
                glMap.once('idle', () => {
                    console.log('Style ready, adding 3D buildings...');
                    add3DBuildings(glMap);
                    attach3DKeyboardHandler();
                    attach3DPointerHandlers(glMap);
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
    detach3DKeyboardHandler();
    detach3DPointerHandlers();
    
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
        
        // Show POI markers and labels again and sync with labels setting
        showPOIMarkers(map);
        applyLabelVisibilityFromSetting();
        
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
                attach3DKeyboardHandler();
                attach3DPointerHandlers(glMap);
                
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
