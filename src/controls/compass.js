/**
 * Compass Control Module
 * Handles the compass UI element for 3D mode
 */

import { baseMaps, getGLMapFromLayer } from '../layers/basemaps.js';

let compassUpdateInterval = null;
let currentMap = null; // Store Leaflet map reference

/**
 * Show the compass control
 * @param {L.Map} map - Leaflet map instance
 */
export function showCompass(map) {
    currentMap = map;
    const compass = document.getElementById('compass');
    if (compass) {
        compass.classList.add('visible');
        startCompassTracking();
    }
}

/**
 * Hide the compass control
 */
export function hideCompass() {
    const compass = document.getElementById('compass');
    if (compass) {
        compass.classList.remove('visible');
        stopCompassTracking();
        // Reset arrow rotation
        const compassArrow = document.getElementById('compass-arrow');
        if (compassArrow) {
            compassArrow.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Start tracking compass rotation based on map bearing
 */
function startCompassTracking() {
    // This will be updated by the 3D mode module via setMapbox3DLayer
    compassUpdateInterval = setInterval(() => {
        updateCompassFromMap();
    }, 100);
}

/**
 * Stop compass tracking
 */
function stopCompassTracking() {
    if (compassUpdateInterval) {
        clearInterval(compassUpdateInterval);
        compassUpdateInterval = null;
    }
}

/**
 * Update compass arrow rotation based on current map bearing
 */
function updateCompassFromMap() {
    // Find the active basemap layer and get its GL map
    if (!currentMap) return;
    
    let activeGLMap = null;
    for (const [name, baseLayer] of Object.entries(baseMaps)) {
        if (currentMap.hasLayer(baseLayer)) {
            activeGLMap = getGLMapFromLayer(baseLayer);
            break;
        }
    }
    
    if (activeGLMap) {
        const bearing = activeGLMap.getBearing();
        updateCompassRotation(bearing);
    }
}

/**
 * Update compass arrow rotation
 * @param {number} bearing - Current map bearing in degrees
 */
function updateCompassRotation(bearing) {
    const compassArrow = document.getElementById('compass-arrow');
    if (compassArrow) {
        // Rotate arrow opposite to map bearing so it always points north
        compassArrow.style.transform = `rotate(${-bearing}deg)`;
    }
}

/**
 * Reset map rotation to north
 */
export function resetMapRotation() {
    if (!currentMap) return;
    
    // Find the active basemap layer and get its GL map
    let activeGLMap = null;
    for (const [name, baseLayer] of Object.entries(baseMaps)) {
        if (currentMap.hasLayer(baseLayer)) {
            activeGLMap = getGLMapFromLayer(baseLayer);
            break;
        }
    }
    
    if (activeGLMap) {
        // Smoothly rotate back to north
        activeGLMap.easeTo({
            bearing: 0,
            pitch: 60,
            duration: 800
        });
        console.log('Map rotation reset to North');
    }
}

/**
 * Initialize compass control
 */
export function initializeCompass() {
    const compass = document.getElementById('compass');
    if (compass) {
        compass.addEventListener('click', resetMapRotation);
        compass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                resetMapRotation();
            }
        });
    }
}

/**
 * Set the mapbox 3D layer reference for compass tracking
 * @deprecated No longer needed - compass now auto-detects active layer
 * @param {Object} layer - Mapbox GL Leaflet layer
 */
export function setMapbox3DLayer(layer) {
    // Kept for backwards compatibility but no longer used
    window._mapbox3DLayer = layer;
}
