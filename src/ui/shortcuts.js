/**
 * Keyboard Shortcuts Module
 * Handles keyboard shortcuts popup and document-level shortcuts
 */

/**
 * Initialize keyboard shortcuts popup
 */
export function initializeKeyboardShortcuts() {
    const shortcuts = document.getElementById('keyboard-shortcuts-view');
    const wrapper = document.getElementById('shortcuts-wrapper');

    function showShortcuts() {
        if (shortcuts && wrapper) {
            shortcuts.style.display = 'block';
            wrapper.style.display = 'block';
            shortcuts.focus();
        }
    }

    function closeShortcuts() {
        if (shortcuts && wrapper) {
            shortcuts.style.display = 'none';
            wrapper.style.display = 'none';
        }
    }

    // Use event delegation so the handler survives DOM changes
    document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('#shortcuts-button');
        if (openBtn) {
            e.preventDefault();
            showShortcuts();
            return;
        }
        const closeBtn = e.target.closest('.popup-close-button');
        if (closeBtn) {
            e.preventDefault();
            closeShortcuts();
        }
    });

    if (wrapper) {
        wrapper.addEventListener('click', function (event) {
            if (event.target === wrapper) {
                closeShortcuts();
            }
        });

        // Close shortcuts with escape key
        wrapper.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeShortcuts();
            }
        });
    }
}

/**
 * Initialize document-level keyboard shortcuts
 */
export function initializeDocumentShortcuts() {
    // Shift + F to focus the search bar
    document.addEventListener('keydown', (event) => {
        if (event.shiftKey && event.code === 'KeyF') {
            event.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.value = '';
            }
        }
    });
}
