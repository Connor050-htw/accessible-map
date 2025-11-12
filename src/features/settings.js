/**
 * Settings Feature Module
 * Handles all user settings (font size, contrast, labels, etc.)
 */

/**
 * Initialize font size controls
 */
export function initializeFontSizeControls() {
    const increaseBtn = document.getElementById('increase-font-size');
    const decreaseBtn = document.getElementById('decrease-font-size');

    // Startwerte dynamisch ermitteln
    let fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let baseVar = getComputedStyle(document.documentElement).getPropertyValue('--map-button-base').trim();
    let buttonSize = baseVar ? parseFloat(baseVar) : 30;

    function applySizes() {
        document.documentElement.style.fontSize = fontSize + 'px';
        document.documentElement.style.setProperty('--map-button-base', buttonSize + 'px');
    }

    function increaseFontSize() {
        fontSize += 2; // feiner Schritt für Text
        buttonSize += 5; // feiner Schritt für Map-Buttons
        applySizes();
        document.body.style.gridTemplateRows = 'auto max-content';
    }

    function decreaseFontSize() {
        fontSize = Math.max(8, fontSize - 2);
        buttonSize = Math.max(20, buttonSize - 5);
        applySizes();
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
    if (highContrastBtn) highContrastBtn.addEventListener('change', toggleHighContrast);
}

/**
 * Initialize label visibility toggle
 */
export function initializeLabelToggle() {
    const labelsBtn = document.getElementById('labels-checkbox');

    if (labelsBtn) {
        labelsBtn.addEventListener('change', applyLabelVisibilityFromSetting);
        // Apply initial state on load
        applyLabelVisibilityFromSetting();
    }
}

/**
 * Apply label visibility based on the current state of the labels checkbox
 */
export function applyLabelVisibilityFromSetting() {
    const labelsBtn = document.getElementById('labels-checkbox');
    const show = !!(labelsBtn && labelsBtn.checked);
    const labels = document.querySelectorAll('.label');
    labels.forEach(label => {
        if (show) {
            label.style.display = 'block';
            label.removeAttribute('tabindex');
        } else {
            label.style.display = 'none';
        }
    });
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
