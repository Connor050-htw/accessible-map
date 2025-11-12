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
import { initializeLODControl } from './features/lod-control.js';
import { initializeVoiceSearch } from './features/voice-search.js';

// Controls
import { initializeCompass, showCompass, hideCompass } from './controls/compass.js';
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
    
    // Store map instance globally for AI capture
    window._leafletMapInstance = map;
    
    // 2. Add default basemap
    const defaultBasemap = getDefaultBasemap();
    defaultBasemap.addTo(map);
    // Ensure GL layer doesn't handle its own interactions in 2D (Leaflet should own them)
    try {
        const glMap = (typeof defaultBasemap.getMapboxMap === 'function')
            ? defaultBasemap.getMapboxMap()
            : defaultBasemap._glMap || null;
        if (glMap) {
            if (glMap.keyboard) glMap.keyboard.disable();
            if (glMap.dragPan) glMap.dragPan.disable();
            if (glMap.scrollZoom) glMap.scrollZoom.disable();
            if (glMap.doubleClickZoom) glMap.doubleClickZoom.disable();
        }
    } catch {}
    
    // 3. Add layer control
    const layerControl = addLayerControl(map);
    
    // 4. Setup map events
    setupMapEvents(map);
    
    // 5. Load POI markers
    try {
        const poiData = await loadPOIMarkers(map);
        console.log('POI markers loaded successfully');
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
            markerLabels: pinLabels
        }).addTo(map);
    }
    
    // 8. Initialize settings
    initializeSettings(map);
    
    // 9. Initialize LOD control
    initializeLODControl(map);
    
    // 10. Initialize UI components
    initializeSidebar(map);
    setupBasemapSelectors(map);
    initializeKeyboardShortcuts();
    initializeDocumentShortcuts();
    
    // 11. Initialize accessibility features
    initializeAccessibility();
    
    // 12. Initialize compass control
    initializeCompass();
    
    // 13. Initialize AI control
    initializeAIControl(map);
    
    // 14. Initialize voice search
    initializeVoiceSearch(map);
    
    // 15. Setup collapsible sections
    setupCollapsible('map-config-toggle', 'map-config-content');
    setupCollapsible('symbols-toggle', 'symbols');
    
    // 15. Initialize 3D mode toggle
    initialize3DToggle(map);
    
    // 16. Setup basemap change handler for 3D mode
    map.on('baselayerchange', (e) => {
        // If 3D mode is active, defer to 3D handler (it will manage interactions)
        if (is3DModeEnabled && typeof is3DModeEnabled === 'function' && is3DModeEnabled()) {
            handle3DBasemapChange(e);
            return;
        }
        // In 2D mode: disable GL interactions on the newly active basemap
        try {
            const layer = e.layer;
            const glMap = (typeof layer.getMapboxMap === 'function')
                ? layer.getMapboxMap()
                : layer._glMap || null;
            if (glMap) {
                if (glMap.keyboard) glMap.keyboard.disable();
                if (glMap.dragPan) glMap.dragPan.disable();
                if (glMap.scrollZoom) glMap.scrollZoom.disable();
                if (glMap.doubleClickZoom) glMap.doubleClickZoom.disable();
            }
        } catch {}
    });
    
    // 17. Export focusPopup for use by PinSearch plugin
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
            }
        } else {
            disable3DMode(map, hideCompass);
        }
    });
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for external use if needed
export { initializeApp, focusPopup };
