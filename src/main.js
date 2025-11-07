/**
 * Main Entry Point
 * Initializes and coordinates all modules of the Accessible Map application
 */

// Core modules
import { initializeMap, setupMapEvents, focusPopup } from './core/map.js';

// Layer modules
import { getDefaultBasemap, addLayerControl } from './layers/basemaps.js';
import { loadPOIMarkers } from './layers/poi-markers.js';

// Features
import { initializeSettings } from './features/settings.js';
import { enable3DMode, disable3DMode, is3DModeEnabled, handle3DBasemapChange } from './features/3d-mode.js';

// Controls
import { initializeCompass, showCompass, hideCompass, setMapbox3DLayer } from './controls/compass.js';
import { initializeAIControl } from './controls/ai-description.js';

// UI modules
import { initializeSidebar, setupBasemapSelectors } from './ui/sidebar.js';
import { initializeKeyboardShortcuts, initializeDocumentShortcuts } from './ui/shortcuts.js';
import { initializeAccessibility } from './ui/accessibility.js';

// Utils
import { setupCollapsible } from './utils/dom-helpers.js';

/**
 * Initialize the entire application
 */
async function initializeApp() {
    console.log('Initializing Accessible Map...');

    // 1. Initialize map
    const map = initializeMap();
    
    // 2. Add default basemap
    const defaultBasemap = getDefaultBasemap();
    defaultBasemap.addTo(map);
    
    // 3. Add layer control
    const layerControl = addLayerControl(map);
    
    // 4. Setup map events
    setupMapEvents(map);
    
    // 5. Load POI markers
    try {
        const poiData = await loadPOIMarkers(map);
        console.log('POI markers loaded successfully');
        
        // Initialize search with POI data (if plugin is available)
        initializeSearch(map, poiData);
    } catch (error) {
        console.error('Failed to load POI markers:', error);
    }
    
    // 6. Add fullscreen control
    L.control.fullscreen({
        position: 'topleft',
        title: 'Open map in fullscreen mode',
        titleCancel: 'Exit fullscreen mode',
        forceSeparateButton: true,
        forcePseudoFullscreen: false,
        fullscreenElement: false
    }).addTo(map);
    
    // 7. Add search control (PinSearch plugin)
    if (typeof L.control.pinSearch !== 'undefined') {
        const pinLabels = [];
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.options.title) {
                pinLabels.push(layer.options.title);
            }
        });
        
        L.control.pinSearch({
            position: 'topright',
            placeholder: 'Search castles',
            maxSearchResults: 5,
            onSearch: (query) => {
                console.log('Searching for:', query);
            },
            markerLabels: pinLabels
        }).addTo(map);
    }
    
    // 8. Initialize settings
    initializeSettings(map);
    
    // 9. Initialize UI components
    initializeSidebar(map);
    setupBasemapSelectors(map);
    initializeKeyboardShortcuts();
    initializeDocumentShortcuts();
    
    // 10. Initialize accessibility features
    initializeAccessibility();
    
    // 11. Initialize compass control
    initializeCompass();
    
    // 12. Initialize AI control
    initializeAIControl(map);
    
    // 13. Setup collapsible sections
    setupCollapsible('map-config-toggle', 'map-config-content');
    setupCollapsible('symbols-toggle', 'symbols');
    
    // 14. Initialize 3D mode toggle
    initialize3DToggle(map);
    
    // 15. Setup basemap change handler for 3D mode
    map.on('baselayerchange', (e) => {
        handle3DBasemapChange(e);
    });
    
    // 16. Export focusPopup for use by PinSearch plugin
    window.focusPopup = focusPopup;
    
    console.log('Accessible Map initialized successfully!');
}

/**
 * Initialize 3D mode toggle
 * @param {L.Map} map - Leaflet map instance
 */
function initialize3DToggle(map) {
    const view3DBtn = document.getElementById('3d-view-checkbox');
    
    if (!view3DBtn) return;
    
    view3DBtn.addEventListener('change', () => {
        if (view3DBtn.checked) {
            const success = enable3DMode(map, showCompass);
            if (!success) {
                view3DBtn.checked = false;
            } else {
                // Store reference for compass
                setTimeout(() => {
                    const mapbox3DLayer = map._layers[Object.keys(map._layers).find(
                        key => map._layers[key].options && map._layers[key].options.accessToken
                    )];
                    if (mapbox3DLayer) {
                        setMapbox3DLayer(mapbox3DLayer);
                    }
                }, 1500);
            }
        } else {
            disable3DMode(map, hideCompass);
        }
    });
}

/**
 * Initialize search functionality (if PinSearch plugin is available)
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} poiData - GeoJSON POI data
 */
function initializeSearch(map, poiData) {
    // PinSearch control is added in HTML via plugin
    // This is just a placeholder for additional search initialization if needed
    console.log('Search control initialized via plugin');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for external use if needed
export { initializeApp, focusPopup };
