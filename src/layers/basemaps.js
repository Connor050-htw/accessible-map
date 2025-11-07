/**
 * Basemap Layer Definitions
 * Defines all available basemap tile layers
 */

import { MAPTILER_KEY, JAWG_ACCESS_TOKEN } from '../core/config.js';

// OpenStreetMap Layers
export const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">OpenStreetMap</a>'
});

export const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
});

// MapTiler Layers
export const mtLayerDataviz = L.tileLayer(`https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" aria-label="MapTiler attribution. Opens in a new tab" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap contributors</a>',
});

export const mtLayerToner = L.tileLayer(`https://api.maptiler.com/maps/toner-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" aria-label="MapTiler attribution. Opens in a new tab" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap contributors</a>',
});

// Jawg Layers
export const jawgLight = L.tileLayer('https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token=' + JAWG_ACCESS_TOKEN, {
    maxZoom: 22,
    crossOrigin: true,
    attribution: '<a href="https://www.jawg.io?utm_medium=map&utm_source=attribution" aria-label="Jawg attribution. Opens in a new tab" target="_blank">&copy; Jawg</a> - <a href="https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'
});

export const jawgDark = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=' + JAWG_ACCESS_TOKEN, {
    maxZoom: 22,
    crossOrigin: true,
    attribution: '<a href="https://www.jawg.io?utm_medium=map&utm_source=attribution" aria-label="Jawg attribution. Opens in a new tab" target="_blank">&copy; Jawg</a> - <a href="https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'
});

// Coarse / low-detail styles (using existing providers with simpler aesthetics)
// These are optional variants to use for lower LOD in 2D without filter hacks.
export const osmMono = L.tileLayer(`https://api.maptiler.com/maps/toner-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
});

export const osmLightBase = L.tileLayer(`https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
});

export const osmBright = L.tileLayer(`https://api.maptiler.com/maps/bright/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
});

// Basemap collection for layer control
export const baseMaps = {
    "OpenStreetMap": osm,
    "OpenStreetMap.HOT": osmHOT,
    "MapTiler Dataviz": mtLayerDataviz,
    "MapTiler Toner": mtLayerToner,
    "Jawg Light": jawgLight,
    "Jawg Dark": jawgDark
};

// Mapping LOD level -> suggested basemap key (used for coarse switching)
export const lodBasemapMap = {
    0: 'MapTiler Toner',      // very stark, minimal detail perception
    1: 'basic',               // we map to osmLightBase tile layer directly (not in control) 
    2: 'MapTiler Dataviz',    // mid detail
    3: 'Jawg Light'           // full detail default
};

// Provide direct access for non-control variants
export const lodExtraLayers = {
    'basic': osmLightBase,
    'bright': osmBright,
    'toner': mtLayerToner,
    'mono': osmMono
};

/**
 * Get the default basemap layer
 * @returns {L.TileLayer} Default basemap (Jawg Light)
 */
export function getDefaultBasemap() {
    return jawgLight;
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
