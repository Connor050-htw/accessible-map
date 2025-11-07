/**
 * Accessibility Module
 * Handles accessibility-related initialization
 */

import { hideFromScreenReaders, removeAttribute } from '../utils/dom-helpers.js';

/**
 * Initialize accessibility features
 */
export function initializeAccessibility() {
    // Hide tooltip pane from screen readers
    const tooltipPane = document.querySelector('.leaflet-tooltip-pane');
    if (tooltipPane) {
        tooltipPane.setAttribute('aria-hidden', 'true');
    }

    // Remove aria-describedby from markers
    removeAttribute('.leaflet-marker-icon', 'aria-describedby');

    // Hide labels from screen readers
    hideFromScreenReaders('.label');
}
