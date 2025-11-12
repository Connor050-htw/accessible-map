/**
 * Sidebar Module
 * Handles sidebar toggle and basemap selector integration
 */

import { baseMaps } from '../layers/basemaps.js';

/**
 * Initialize settings navigation button in header
 */
function initializeSettingsNavButton() {
    const settingsButton = document.getElementById('settings-nav-button');
    if (!settingsButton) return;

    settingsButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        
        const sidebar = document.getElementById('sidebar');
        const mapConfigToggle = document.getElementById('map-config-toggle');
        const mapConfigContent = document.getElementById('map-config-content');

        // Ensure sidebar is visible
        if (sidebar && sidebar.classList.contains('hidden')) {
            document.getElementById('sidebar-button')?.click();
        }

        // Ensure map configuration section is expanded
        if (mapConfigContent && mapConfigContent.classList.contains('hidden')) {
            mapConfigToggle?.click();
        }

        // Set focus on the toggle button for accessibility (no scrolling)
        if (mapConfigToggle) {
            setTimeout(() => {
                mapConfigToggle.focus();
            }, 100);
        }
    });
}

/**
 * Initialize sidebar toggle functionality
 * @param {L.Map} map - Leaflet map instance
 */
export function initializeSidebar(map) {
    const sidebarButton = document.getElementById('sidebar-button');
    const sidebar = document.getElementById('sidebar');
    const mobileScreen = window.matchMedia('(max-width: 768px)').matches;

    if (!sidebarButton || !sidebar) return;

    // Set initial button content
    sidebarButton.firstElementChild.innerHTML = mobileScreen ? '>' : '<';

    sidebarButton.addEventListener('click', () => {
        if (mobileScreen) {
            sidebar.classList.toggle('displayed');
        } else {
            sidebar.classList.toggle('hidden');
        }

        document.body.classList.toggle('hidden-sidebar');
        
        // Update button content
        if (mobileScreen) {
            sidebarButton.firstElementChild.innerHTML = sidebar.classList.contains('displayed') ? '<' : '>';
        } else {
            sidebarButton.firstElementChild.innerHTML = sidebar.classList.contains('hidden') ? '>' : '<';
        }

        // Update aria-label
        if (sidebar.classList.contains('hidden')) {
            sidebarButton.setAttribute('aria-label', 'Show complementary content');
        } else {
            sidebarButton.setAttribute('aria-label', 'Hide complementary content');
        }

        // Refresh map size
        map.invalidateSize();
    });

    // Keyboard support
    sidebarButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sidebarButton.click();
        }
    });

    // Initialize settings navigation button in header
    initializeSettingsNavButton();
}

/**
 * Setup basemap selector buttons in sidebar
 * @param {L.Map} map - Leaflet map instance
 */
export function setupBasemapSelectors(map) {
    const basemapSelectors = document.querySelectorAll('.basemap-selector-button');

    // Function to update basemap selection visual state
    function updateBasemapSelection() {
        const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
        
        basemapLayers.forEach((layer, index) => {
            if (layer.checked && basemapSelectors[index]) {
                basemapSelectors[index].classList.add('selected');
            }
        });
    }

    // Add click handlers to sidebar buttons
    basemapSelectors.forEach((selector, index) => {
        selector.addEventListener('click', () => {
            // Re-query the layer control elements in case they changed
            const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
            if (basemapLayers[index]) {
                basemapLayers[index].click();
            }
        });
    });

    // Watch for layer changes and update visual selection
    map.on('baselayerchange', () => {
        const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
        basemapLayers.forEach((layer, index) => {
            if (layer.checked && basemapSelectors[index]) {
                basemapSelectors.forEach(sel => sel.classList.remove('selected'));
                basemapSelectors[index].classList.add('selected');
            }
        });
    });

    // Initial update
    updateBasemapSelection();
}
