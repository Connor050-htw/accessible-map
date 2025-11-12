/**
 * Basemap Layer Definitions (Vector Tiles)
 * All basemaps now use Mapbox GL for full LOD control
 */

import { MAPTILER_KEY, JAWG_ACCESS_TOKEN, MAPBOX_TOKEN } from '../core/config.js';

/**
 * Create a Mapbox GL vector layer for use with Leaflet
 * @param {string} style - Mapbox GL style URL
 * @param {string} name - Layer name for identification
 * @returns {L.MapboxGL} Vector tile layer
 */
function createVectorLayer(style, name) {
    return L.mapboxGL({
        accessToken: MAPBOX_TOKEN,
        style: style,
        pane: 'tilePane',
        interactive: true,
        attributionControl: false, // Handled by map
        dragRotate: false, // 2D by default
        pitchWithRotate: false,
        touchPitch: false,
        // Important: let Leaflet own pan/zoom/keyboard in 2D to keep markers in sync
        dragPan: false,
        scrollZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        // MUST be true to allow canvas export for AI description
        preserveDrawingBuffer: true,
        // Slightly lower update rate to avoid jumpy re-renders on rapid zoom
        updateInterval: 32,
        // Enable small fade duration to smooth style/layer transitions
        fadeDuration: 150
    });
}

// Vector Basemaps using Mapbox GL styles
export const osm = createVectorLayer(
    `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`,
    'OpenStreetMap'
);

export const osmHOT = createVectorLayer(
    `https://api.maptiler.com/maps/bright/style.json?key=${MAPTILER_KEY}`,
    'OpenStreetMap.HOT'
);

export const mtLayerDataviz = createVectorLayer(
    `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`,
    'MapTiler Dataviz'
);

export const mtLayerToner = createVectorLayer(
    `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`,
    'MapTiler Toner'
);

export const jawgLight = createVectorLayer(
    `https://api.jawg.io/styles/jawg-light.json?access-token=${JAWG_ACCESS_TOKEN}`,
    'Jawg Light'
);

export const jawgDark = createVectorLayer(
    `https://api.jawg.io/styles/jawg-dark.json?access-token=${JAWG_ACCESS_TOKEN}`,
    'Jawg Dark'
);

// Basemap collection for layer control
export const baseMaps = {
    "OpenStreetMap": osm,
    "OpenStreetMap.HOT": osmHOT,
    "MapTiler Dataviz": mtLayerDataviz,
    "MapTiler Toner": mtLayerToner,
    "Jawg Light": jawgLight,
    "Jawg Dark": jawgDark
};

/**
 * Get the default basemap layer
 * @returns {L.MapboxGL} Default basemap (Jawg Light)
 */
export function getDefaultBasemap() {
    return jawgLight;
}

/**
 * Get the Mapbox GL map instance from a vector layer
 * @param {L.MapboxGL} layer - Vector tile layer
 * @returns {mapboxgl.Map|null} Underlying Mapbox GL map
 */
export function getGLMapFromLayer(layer) {
    if (!layer) return null;
    try {
        return (typeof layer.getMapboxMap === 'function') ? layer.getMapboxMap() : layer._glMap || null;
    } catch {
        return null;
    }
}

/**
 * Add layer control to the map
 * @param {L.Map} map - The Leaflet map instance
 * @returns {L.Control.Layers} The layer control
 */
export function addLayerControl(map) {
    const layerControl = L.control.layers(baseMaps).setPosition('topleft').addTo(map);
    return layerControl;
}
