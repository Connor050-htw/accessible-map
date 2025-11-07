/**
 * Configuration and Constants
 * Contains all API keys, tokens, and configuration values
 */

// MapTiler API Key
export const MAPTILER_KEY = 'fTqz035OSDg9GsUaD2Fu';

// Jawg API Access Token
export const JAWG_ACCESS_TOKEN = '72PfAsavPGBrPQf2FE0JOoybXUoXPpap3zQOpRhL0bsmh5CK4eilk2S9zcq3xAra';

// Mapbox Access Token (loaded from global window.MAPBOX_TOKEN or default)
export const MAPBOX_TOKEN = (typeof window !== 'undefined' && window.MAPBOX_TOKEN) 
    ? window.MAPBOX_TOKEN 
    : 'YOUR_MAPBOX_TOKEN';

// AI API Configuration
export const AI_API_BASE = 'http://127.0.0.1:8000';

// Map Initial View
export const MAP_CONFIG = {
    center: [47.69, 13.38],
    zoom: 7,
    minZoom: 3,
    maxZoom: 19
};

// Data Source
export const DATA_SOURCE = './data/austriancastles.geojson';

// POI Filter Configuration
export const POI_FILTER = {
    tourism: 'attraction',
    requireImage: true,
    requireDescription: true,
    excludeRuins: true
};
