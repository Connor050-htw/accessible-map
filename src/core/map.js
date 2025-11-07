/**
 * Map Initialization Module
 * Creates and configures the Leaflet map instance
 */

import { MAP_CONFIG } from './config.js';

/**
 * Initialize the Leaflet map
 * @returns {L.Map} Configured Leaflet map instance
 */
export function initializeMap() {
    const map = L.map('map', {
        attributionControl: true,
        setPrefix: false,
        layers: [], // Layers will be added separately
        // Smoother zoom behavior with vector tiles (avoid interim bitmap scaling)
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: true,
        zoomSnap: 0,           // allow fractional zoom levels for smoother wheel zoom
        zoomDelta: 0.25,       // smaller steps per programmatic zoom
        wheelDebounceTime: 25, // make wheel zoom feel responsive
        wheelPxPerZoomLevel: 80
    }).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);

    // Add keyboard shortcuts to attribution control
    map.attributionControl.addAttribution(
        '<button id="shortcuts-button" aria-label="Keyboard Shortcuts">Keyboard Shortcuts</button>'
    );

    return map;
}

/**
 * Setup map event listeners for popups and keyboard navigation
 * @param {L.Map} map - The Leaflet map instance
 */
export function setupMapEvents(map) {
    // Close popup with escape key
    map.on('keydown', (event) => {
        try {
            if (event.originalEvent.key === 'Escape' && document.querySelector('.search-results')?.style.display === 'block') {
                document.querySelector('.search-results').style.display = 'none';
            } else if (event.originalEvent.key === 'Escape' && map.hasLayer(map._popup)) {
                map.closePopup();
            }
        } catch (error) {
            console.log('No popup or search results open');
        }
    });

    // Save and return focus to the last focused element after closing the popup
    map.on('popupopen', () => {
        let lastFocusedElement = document.activeElement;
        map.on('popupclose', () => lastFocusedElement.focus());
    });

    // Zoom with + and - keys when popup is open
    map.on('popupopen', () => {
        const handler = (event) => {
            if (event.key === '+' || event.key === '=') {
                map.zoomIn();
            } else if (event.key === '-') {
                map.zoomOut();
            }
        };
        document.addEventListener('keydown', handler);
        
        // Clean up listener
        map.once('popupclose', () => {
            document.removeEventListener('keydown', handler);
        });
    });

    // Arrow keys move the map when popup is open
    map.on('popupopen', () => {
        const main = document.querySelector('main');
        if (!main || !map.hasLayer(map._popup)) return;

        const handler = (event) => {
            const moveDistance = 100;
            switch (event.key) {
                case 'ArrowUp':
                    map.panBy([0, -moveDistance]);
                    break;
                case 'ArrowDown':
                    map.panBy([0, moveDistance]);
                    break;
                case 'ArrowLeft':
                    map.panBy([-moveDistance, 0]);
                    break;
                case 'ArrowRight':
                    map.panBy([moveDistance, 0]);
                    break;
            }
        };
        
        main.addEventListener('keydown', handler);
        
        // Clean up listener
        map.once('popupclose', () => {
            main.removeEventListener('keydown', handler);
        });
    });

    // Fullscreen events
    map.on('enterFullscreen', () => {
        const fullscreenElement = document.querySelector('.leaflet-fullscreen-on');
        if (fullscreenElement) {
            fullscreenElement.setAttribute('aria-label', 'Exit fullscreen mode');
        }
    });

    map.on('exitFullscreen', () => {
        const fullscreenElement = document.querySelector('.fullscreen-icon');
        if (fullscreenElement) {
            fullscreenElement.setAttribute('aria-label', 'Open map in fullscreen mode');
        }
    });
}

/**
 * Focus the popup content for accessibility
 */
export function focusPopup() {
    const popup = document.querySelector('.leaflet-popup-content');
    if (popup) {
        popup.style.padding = '5px';
        popup.setAttribute('tabindex', '0');
        popup.focus();
    }
}
