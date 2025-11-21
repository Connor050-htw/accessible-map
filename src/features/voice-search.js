/**
 * Voice Search Module
 * Enables voice-based search for castles and POIs using the Web Speech API
 */

import { poiMarkers } from '../layers/poi-markers.js';

let recognition = null;
let isListening = false;

/**
 * Initialize voice search functionality
 * @param {L.Map} map - The Leaflet map instance
 */
export function initializeVoiceSearch(map) {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        return false;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.lang = 'de-DE'; // German language
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5; // Get multiple alternatives for better matching

    // Handle results
    recognition.onresult = (event) => {
        handleVoiceResult(event, map);
    };

    // Handle errors
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateVoiceControlButton('error');
        
        // Reset button after 3 seconds
        setTimeout(() => {
            updateVoiceControlButton('idle');
        }, 3000);
    };

    // Handle end of recognition
    recognition.onend = () => {
        if (isListening) {
            isListening = false;
            // Nur auf 'idle' setzen, wenn der Button nicht gerade Feedback zeigt
            const btn = document.getElementById('voice-control-btn');
            if (btn && !btn.classList.contains('success') && !btn.classList.contains('error')) {
                updateVoiceControlButton('idle');
            }
        }
        console.log('Voice recognition ended');
    };

    // Add voice search control to map
    createVoiceControl(map);

    console.log('Voice search initialized');
    return true;
}

/**
 * Create the voice search control as Leaflet control
 * @param {L.Map} map - The Leaflet map instance
 */
function createVoiceControl(map) {
    const VoiceSearchControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-voice');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const voiceBtn = L.DomUtil.create('button', 'voice-control-btn', container);
            voiceBtn.type = 'button';
            voiceBtn.id = 'voice-control-btn';
            voiceBtn.title = 'Sprachsuche (Shift+K)';
            voiceBtn.setAttribute('aria-label', 'Sprachsuche');
            
            // Create img element for mic icon
            const micIcon = L.DomUtil.create('img', 'voice-mic-icon', voiceBtn);
            micIcon.src = './images/mic.jpg';
            micIcon.alt = '';
            micIcon.setAttribute('aria-hidden', 'true');

            voiceBtn.addEventListener('click', () => toggleVoiceSearch(map));

            return container;
        }
    });

    map.addControl(new VoiceSearchControl({ position: 'topleft' }));

    // Add keyboard shortcut (Shift + K)
    document.addEventListener('keydown', (e) => {
        // Use event.code to be layout independent and require Shift modifier
        if (e.shiftKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
            e.preventDefault();
            toggleVoiceSearch(map);
        }
    });

    // Reorder controls after a short delay
    setTimeout(() => {
        reorderControls();
    }, 150);
}

/**
 * Reorder controls: Zoom, Fullscreen, Audio, Voice, Layers
 */
function reorderControls() {
    try {
        const corner = document.querySelector('.leaflet-top.leaflet-left');
        const zoomCtrl = document.querySelector('.leaflet-control-zoom');
        const fullscreenCtrl = document.querySelector('.leaflet-control-fullscreen');
        const aiCtrl = document.querySelector('.leaflet-control-ai');
        const voiceCtrl = document.querySelector('.leaflet-control-voice');
        const layersCtrl = document.querySelector('.leaflet-control-layers');
        
        if (corner) {
            const controls = [zoomCtrl, fullscreenCtrl, aiCtrl, voiceCtrl, layersCtrl].filter(ctrl => ctrl);
            
            controls.forEach(ctrl => {
                if (ctrl && ctrl.parentNode === corner) {
                    corner.removeChild(ctrl);
                }
            });
            
            // Re-add in correct order
            if (zoomCtrl) corner.appendChild(zoomCtrl);
            if (fullscreenCtrl) corner.appendChild(fullscreenCtrl);
            if (aiCtrl) corner.appendChild(aiCtrl);
            if (voiceCtrl) corner.appendChild(voiceCtrl);
            if (layersCtrl) corner.appendChild(layersCtrl);
            
            console.log('Controls reordered: Zoom → Fullscreen → Audio → Voice → Layers');
        }
    } catch (e) {
        console.debug('Control reorder skipped:', e);
    }
}

/**
 * Toggle voice search on/off
 * @param {L.Map} map - The Leaflet map instance
 */
function toggleVoiceSearch(map) {
    if (!recognition) {
        console.warn('Speech recognition not supported');
        updateVoiceControlButton('error');
        setTimeout(() => updateVoiceControlButton('idle'), 3000);
        return;
    }

    if (isListening) {
        // Stop listening
        recognition.stop();
        isListening = false;
        updateVoiceControlButton('idle');
    } else {
        // Start listening
        try {
            recognition.start();
            isListening = true;
            updateVoiceControlButton('listening');
        } catch (error) {
            console.error('Error starting recognition:', error);
            isListening = false;
            updateVoiceControlButton('error');
            setTimeout(() => updateVoiceControlButton('idle'), 3000);
        }
    }
}

/**
 * Handle voice recognition result
 * @param {SpeechRecognitionEvent} event - The recognition event
 * @param {L.Map} map - The Leaflet map instance
 */
function handleVoiceResult(event, map) {
    const results = event.results[0];
    const transcript = results[0].transcript.toLowerCase().trim();
    
    console.log('Voice input received:', transcript);

    // Extract castle name from transcript
    const castleName = extractCastleName(transcript);
    
    if (!castleName) {
        console.log('No castle name recognized');
        updateVoiceControlButton('error');
        setTimeout(() => updateVoiceControlButton('idle'), 3000);
        return;
    }

    // Search for the castle
    const foundMarker = searchCastle(castleName);
    
    if (foundMarker) {
        // Zoom to the castle
        zoomToCastle(map, foundMarker);
        updateVoiceControlButton('success');
        console.log('Castle found:', foundMarker.options.title);
        
        // Reset button after 3 seconds
        setTimeout(() => updateVoiceControlButton('idle'), 3000);
    } else {
        console.log('Castle not found:', castleName);
        updateVoiceControlButton('error');
        
        // Reset button after 3 seconds
        setTimeout(() => updateVoiceControlButton('idle'), 3000);
    }
}

/**
 * Extract castle name from voice transcript
 * @param {string} transcript - The voice input text
 * @returns {string|null} The extracted castle name or null
 */
function extractCastleName(transcript) {
    // Remove common command phrases
    const patterns = [
        /(?:zeige mir (?:die )?|zeig mir (?:die )?|wo ist (?:die )?|finde (?:die )?|suche (?:die )?)?(.+)/i,
    ];

    for (const pattern of patterns) {
        const match = transcript.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return transcript; // Return the whole transcript if no pattern matches
}

/**
 * Search for a castle by name
 * @param {string} searchName - The name to search for
 * @returns {L.Marker|null} The found marker or null
 */
function searchCastle(searchName) {
    const normalizedSearch = normalizeString(searchName);
    
    console.log('Searching for:', normalizedSearch);
    
    // Try to find exact or partial matches
    let bestMatch = null;
    let bestScore = 0;

    for (const marker of poiMarkers) {
        const markerName = marker.options.title;
        const normalizedMarkerName = normalizeString(markerName);
        
        // Calculate similarity score
        const score = calculateSimilarity(normalizedSearch, normalizedMarkerName);
        
        console.log(`Comparing "${normalizedSearch}" with "${normalizedMarkerName}": score ${score}`);
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = marker;
        }

        // If we find a very good match, use it immediately
        if (score >= 0.8) {
            console.log('High confidence match found');
            break;
        }
    }

    // Only return a match if the score is reasonable
    if (bestScore >= 0.4) {
        console.log('Best match:', bestMatch?.options.title, 'with score', bestScore);
        return bestMatch;
    }

    return null;
}

/**
 * Normalize a string for comparison (remove diacritics, lowercase, etc.)
 * @param {string} str - The string to normalize
 * @returns {string} The normalized string
 */
function normalizeString(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .trim();
}

/**
 * Calculate similarity between two strings (simple matching algorithm)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
    // Check for exact match
    if (str1 === str2) return 1;

    // Check if one contains the other
    if (str2.includes(str1)) return 0.9;
    if (str1.includes(str2)) return 0.8;

    // Check word-by-word matching
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matchedWords = 0;
    for (const word1 of words1) {
        for (const word2 of words2) {
            if (word2.includes(word1) || word1.includes(word2)) {
                matchedWords++;
                break;
            }
        }
    }

    // Calculate score based on matched words
    const wordScore = matchedWords / Math.max(words1.length, words2.length);
    
    // Use Levenshtein-inspired score for short strings
    const lengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
    
    return Math.max(wordScore, lengthRatio * 0.5);
}

/**
 * Zoom to a castle marker and open its popup
 * @param {L.Map} map - The Leaflet map instance
 * @param {L.Marker} marker - The marker to zoom to
 */
function zoomToCastle(map, marker) {
    const latlng = marker.getLatLng();
    
    // Zoom to the castle with animation
    map.flyTo(latlng, 15, {
        duration: 2,
        easeLinearity: 0.25
    });

    // Open the popup after a short delay
    setTimeout(() => {
        marker.openPopup();
        
        // Focus the popup for screen readers
        if (typeof window.focusPopup === 'function') {
            window.focusPopup();
        }
    }, 2000);
}

/**
 * Update the voice control button state
 * @param {string} state - Button state: 'idle', 'listening', 'success', 'error'
 */
function updateVoiceControlButton(state) {
    const btn = document.getElementById('voice-control-btn');
    if (!btn) return;

    // Remove all state classes
    btn.classList.remove('listening', 'success', 'error');

    switch(state) {
        case 'listening':
            btn.classList.add('listening');
            btn.title = 'Hört zu... (klicken zum Abbrechen)';
            btn.setAttribute('aria-label', 'Hört zu');
            btn.setAttribute('aria-pressed', 'true');
            break;
        case 'success':
            btn.classList.add('success');
            btn.title = 'Burg gefunden!';
            btn.setAttribute('aria-label', 'Burg gefunden');
            break;
        case 'error':
            btn.classList.add('error');
            btn.title = 'Nicht gefunden';
            btn.setAttribute('aria-label', 'Nicht gefunden');
            break;
        default: // 'idle'
            btn.title = 'Sprachsuche (Shift+K)';
            btn.setAttribute('aria-label', 'Sprachsuche');
            btn.setAttribute('aria-pressed', 'false');
            break;
    }
}

/**
 * Check if voice search is supported
 * @returns {boolean} Whether voice search is supported
 */
export function isVoiceSearchSupported() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
}

export { toggleVoiceSearch };
