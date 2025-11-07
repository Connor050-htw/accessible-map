/**
 * DOM Helper Utilities
 * Utility functions for DOM manipulation and element setup
 */

/**
 * Setup collapsible sections (e.g., Map Configuration, Symbols)
 * @param {string} toggleId - ID of the toggle button
 * @param {string} contentId - ID of the content to collapse/expand
 */
export function setupCollapsible(toggleId, contentId) {
    const btn = document.getElementById(toggleId);
    const content = document.getElementById(contentId);
    if (!btn || !content) return;

    const header = btn.closest('.section-header');
    const heading = header ? header.querySelector('h2') : null;

    const applyState = (expanded) => {
        btn.setAttribute('aria-expanded', String(expanded));
        const arrowEl = btn.querySelector('.arrow');
        if (arrowEl) arrowEl.textContent = expanded ? '▾' : '▸';
        content.classList.toggle('hidden', !expanded);
    };

    const toggle = () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        applyState(!expanded);
    };

    // Click on the button toggles
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
    });

    // Make heading keyboard-accessible to toggle
    if (heading) {
        heading.setAttribute('tabindex', '0');
        heading.classList.add('clickable-heading');
        heading.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    }

    // Click anywhere on the header row toggles
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('#' + toggleId)) return;
            toggle();
        });
    }

    // Ensure initial state matches aria-expanded
    const initExpanded = btn.getAttribute('aria-expanded') === 'true';
    applyState(initExpanded);
}

/**
 * Hide element from screen readers
 * @param {string} selector - CSS selector
 */
export function hideFromScreenReaders(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.setAttribute('aria-hidden', 'true'));
}

/**
 * Remove attribute from elements
 * @param {string} selector - CSS selector
 * @param {string} attribute - Attribute name to remove
 */
export function removeAttribute(selector, attribute) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.removeAttribute(attribute));
}
