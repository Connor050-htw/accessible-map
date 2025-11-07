/**
 * Settings Feature Module
 * Handles all user settings (font size, contrast, labels, etc.)
 */

/**
 * Initialize font size controls
 */
export function initializeFontSizeControls() {
    let fontSize = 16;
    const increaseBtn = document.getElementById('increase-font-size');
    const decreaseBtn = document.getElementById('decrease-font-size');

    function increaseFontSize() {
        fontSize += 2;
        document.documentElement.style.fontSize = fontSize + 'px';
        document.body.style.gridTemplateRows = 'auto max-content';
    }

    function decreaseFontSize() {
        fontSize -= 2;
        document.documentElement.style.fontSize = fontSize + 'px';
    }

    if (increaseBtn) increaseBtn.addEventListener('click', increaseFontSize);
    if (decreaseBtn) decreaseBtn.addEventListener('click', decreaseFontSize);
}

/**
 * Initialize high contrast mode toggle
 * @param {L.Map} map - Leaflet map instance
 */
export function initializeHighContrastMode(map) {
    const highContrastBtn = document.getElementById('contrast-checkbox');

    function toggleHighContrast() {
        if (highContrastBtn.checked) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    if (highContrastBtn) {
        highContrastBtn.addEventListener('change', toggleHighContrast);
    }

    // Add filter to popup images in high contrast mode
    map.on('popupopen', () => {
        if (document.body.classList.contains('high-contrast')) {
            const img = document.querySelector('.leaflet-popup-content img');
            if (img) img.style.filter = 'invert()';
        }
    });
}

/**
 * Initialize label visibility toggle
 */
export function initializeLabelToggle() {
    const labelsBtn = document.getElementById('labels-checkbox');

    if (labelsBtn) {
        labelsBtn.addEventListener('change', () => {
            const labels = document.querySelectorAll('.label');
            labels.forEach(label => {
                if (labelsBtn.checked) {
                    label.style.display = 'block';
                    label.removeAttribute('tabindex');
                } else {
                    label.style.display = 'none';
                }
            });
        });
    }
}


/**
 * Initialize all settings
 * @param {L.Map} map - Leaflet map instance
 */
export function initializeSettings(map) {
    initializeFontSizeControls();
    initializeHighContrastMode(map);
    initializeLabelToggle();
}
