/**
 * POI Markers Module
 * Handles loading and displaying castle/POI markers on the map
 */

import { DATA_SOURCE, POI_FILTER } from '../core/config.js';
import { focusPopup } from '../core/map.js';

// Storage for marker and label references
export const poiMarkers = [];
export const poiLabels = [];

/**
 * Load and display POI markers from GeoJSON data
 * @param {L.Map} map - The Leaflet map instance
 * @returns {Promise<void>}
 */
export async function loadPOIMarkers(map) {
    try {
        const response = await fetch(DATA_SOURCE);
        const data = await response.json();

        L.geoJSON(data, {
            filter: filterPOI,
            pointToLayer: (poi, latlng) => createMarker(poi, latlng),
            onEachFeature: (poi, layer) => addPOIFeatures(poi, layer, map)
        }).addTo(map);

        return data; // Return for use in search
    } catch (error) {
        console.error('Error loading POI data:', error);
        throw error;
    }
}

/**
 * Filter POIs based on configuration
 * @param {Object} poi - GeoJSON feature
 * @returns {boolean} Whether to include this POI
 */
function filterPOI(poi) {
    const props = poi.properties;
    const isAttraction = props.tourism === POI_FILTER.tourism;
    const hasImg = POI_FILTER.requireImage ? props['img_file'] !== null : true;
    const hasDescription = POI_FILTER.requireDescription ? props['description-translated'] !== null : true;
    const isNotRuin = POI_FILTER.excludeRuins ? (props.ruins === 'no' || props.ruins === null) : true;
    
    return isNotRuin && isAttraction && hasImg && hasDescription;
}

/**
 * Create a marker for a POI
 * @param {Object} poi - GeoJSON feature
 * @param {L.LatLng} latlng - Marker position
 * @returns {L.Marker}
 */
function createMarker(poi, latlng) {
    const markerOptions = {
        title: poi.properties.name,
        alt: poi.properties.name
    };
    const marker = L.marker(latlng, markerOptions);
    poiMarkers.push(marker); // Store reference
    return marker;
}

/**
 * Add features (popup, label) to a POI layer
 * @param {Object} poi - GeoJSON feature
 * @param {L.Layer} layer - Leaflet layer
 * @param {L.Map} map - The map instance
 */
function addPOIFeatures(poi, layer, map) {
    // Add popup
    const popupContent = `
        <h2>${poi.properties.name}</h2>
        <img src="${poi.properties["img_file"]}" alt="Foto von ${poi.properties.name}">
        <p>${poi.properties['description-translated']}</p>
    `;
    layer.bindPopup(popupContent);

    // Add label
    const label = L.divIcon({
        className: 'label',
        html: poi.properties.name,
    });

    const labelMarker = L.marker(
        [poi.geometry.coordinates[1], poi.geometry.coordinates[0]], 
        { icon: label }
    ).addTo(map);
    
    poiLabels.push(labelMarker); // Store reference

    // Focus popup on click/enter
    layer.on('click', focusPopup);
    layer.on('keypress', (event) => {
        if (event.originalEvent.key === 'Enter') {
            focusPopup();
        }
    });
}

/**
 * Show all POI markers and labels
 * @param {L.Map} map - The map instance
 */
export function showPOIMarkers(map) {
    poiMarkers.forEach(marker => {
        if (!map.hasLayer(marker)) {
            marker.addTo(map);
        }
    });
    poiLabels.forEach(label => {
        if (!map.hasLayer(label)) {
            label.addTo(map);
        }
    });
}

/**
 * Hide all POI markers and labels
 * @param {L.Map} map - The map instance
 */
export function hidePOIMarkers(map) {
    poiMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    poiLabels.forEach(label => {
        if (map.hasLayer(label)) {
            map.removeLayer(label);
        }
    });
}
