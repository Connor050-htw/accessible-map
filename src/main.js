/**
 * Main Entry Point
 * Initializes and coordinates all modules of the Accessible Map application
 */

// Core modules
import { initializeMap, setupMapEvents, focusPopup } from './core/map.js';

// Layer modules
import { getDefaultBasemap, addLayerControl } from './layers/basemaps.js';
import { loadPOIMarkers, poiMarkers } from './layers/poi-markers.js';

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
    let poiData = null;
    try {
        poiData = await loadPOIMarkers(map);
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
    setupCollapsible('castles-toggle', 'castles-content');

    // Populate and keep castles list in sync with visible markers
    setupCastlesListSync(map);
    
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

/**
 * Populate the castles list section from GeoJSON features
 * @param {Array} features - GeoJSON Feature array
 */
function setupCastlesListSync(map) {
    const listEl = document.getElementById('castles-list');
    if (!listEl) return;

    let debounceTimer = null;
    let expandedName = null; // remember currently expanded item by name
    const debouncedUpdate = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateFromMap, 100);
    };

    const updateFromMap = () => {
        if (!map) return;
        const bounds = map.getBounds();
        const visible = poiMarkers.filter(m => map.hasLayer(m) && bounds.contains(m.getLatLng()));

        // Build unique list by name
        const nameToMarker = new Map();
        for (const m of visible) {
            const name = (m.options && m.options.title) ? String(m.options.title).trim() : null;
            if (!name) continue;
            if (!nameToMarker.has(name)) nameToMarker.set(name, m);
        }
        const names = Array.from(nameToMarker.keys()).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

        // Rebuild list
        const frag = document.createDocumentFragment();
        let idx = 0;
        names.forEach(name => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = name;
            btn.setAttribute('aria-expanded', 'false');
            const detailsId = `castle-details-${idx++}`;
            btn.setAttribute('aria-controls', detailsId);
            const details = document.createElement('div');
            details.className = 'castle-details hidden';
            details.id = detailsId;

            btn.addEventListener('click', () => {
                const marker = nameToMarker.get(name);
                if (!marker) return;

                // Map interaction
                try {
                    map.panTo(marker.getLatLng());
                    marker.openPopup();
                    if (typeof window.focusPopup === 'function') {
                        setTimeout(() => window.focusPopup(), 50);
                    }
                } catch {}

                // Collapse others
                listEl.querySelectorAll('.castle-details').forEach(d => {
                    if (d !== details) d.classList.add('hidden');
                });
                listEl.querySelectorAll('.castle-list button[aria-expanded="true"]').forEach(b => {
                    if (b !== btn) b.setAttribute('aria-expanded', 'false');
                });

                // Toggle this details section
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                if (expanded) {
                    btn.setAttribute('aria-expanded', 'false');
                    details.classList.add('hidden');
                    expandedName = null;
                } else {
                    try {
                        const content = marker.getPopup() ? marker.getPopup().getContent() : '';
                        details.innerHTML = sanitizeDetailsHtml(content, name) || '';
                    } catch {
                        details.innerHTML = '';
                    }
                    btn.setAttribute('aria-expanded', 'true');
                    details.classList.remove('hidden');
                    expandedName = name;
                }
            });

            li.appendChild(btn);
            li.appendChild(details);
            frag.appendChild(li);

            // Restore open state if this is the previously expanded item
            if (expandedName && expandedName === name) {
                const marker = nameToMarker.get(name);
                try {
                    const content = marker && marker.getPopup() ? marker.getPopup().getContent() : '';
                    details.innerHTML = sanitizeDetailsHtml(content, name) || '';
                } catch {
                    details.innerHTML = '';
                }
                btn.setAttribute('aria-expanded', 'true');
                details.classList.remove('hidden');
            }
        });

        listEl.innerHTML = '';
        listEl.appendChild(frag);

        // No global details to hide; per-item handled above
    };

    // Initial fill once markers are on the map
    setTimeout(updateFromMap, 0);

    // Update on map interactions and layer changes
    map.on('moveend', debouncedUpdate);
    map.on('zoomend', debouncedUpdate);
    map.on('layeradd', debouncedUpdate);
    map.on('layerremove', debouncedUpdate);
}

/**
 * Remove the castle name heading from popup HTML for inline display
 * @param {string} html - Popup HTML string
 * @param {string} name - Castle name to remove if heading matches
 * @returns {string}
 */
function sanitizeDetailsHtml(html, name) {
    if (!html) return '';
    try {
        const container = document.createElement('div');
        container.innerHTML = html;
        // Remove the first heading or any heading matching the name
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
            // Prefer removing headings whose text matches the name
            let removed = false;
            headings.forEach(h => {
                if (!removed && h.textContent && h.textContent.trim().localeCompare(name, 'de', { sensitivity: 'base' }) === 0) {
                    h.remove();
                    removed = true;
                }
            });
            if (!removed) {
                // Fallback: remove the first heading
                headings[0].remove();
            }
        }
        return container.innerHTML;
    } catch {
        return html;
    }
}
