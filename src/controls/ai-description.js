/**
 * AI Description Control Module
 * Handles AI-powered audio description of the map
 */

import { AI_API_BASE } from '../core/config.js';
import { captureMapAsDataUrl } from '../utils/map-capture.js';

let isAudioOn = true;
let isSpeaking = false;

/**
 * Update AI button visuals based on speaking state
 * @param {boolean} speaking - Whether audio is currently playing
 */
function updateAIButtonVisuals(speaking) {
    const btn = document.querySelector('.leaflet-control-ai .ai-main-btn');
    if (!btn) return;
    const icon = speaking ? 'speaker_mute_icon.png' : 'speaker_icon.png';
    btn.innerHTML = `<img src="./images/${icon}" alt="" aria-hidden="true" width="18" height="18">`;
    const label = speaking ? 'Stop Audiodescription' : 'Start Audiodescription';
    btn.title = label;
    btn.setAttribute('aria-label', label);
}

/**
 * Stop audio playback
 */
export function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        updateAIButtonVisuals(false);
        console.log('Audio stopped');
    }
}

/**
 * Get playback speed from UI
 * @returns {number} Speed value (default 1.0)
 */
function getSpeed() {
    const aiSpeed = document.getElementById('ai-speed');
    return aiSpeed ? (parseFloat(aiSpeed.value) || 1.0) : 1.0;
}

/**
 * Request description from AI API
 * @param {string} imageDataUrl - Base64 data URL of map image
 * @returns {Promise<Object>} API response
 */
async function requestDescription(imageDataUrl) {
    const body = {
        data_url: imageDataUrl,
        speed: getSpeed(),
        voice: 'random',
        response_type: 'text',
        skip_openai: false
    };
    const res = await fetch(`${AI_API_BASE}/description/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 */
function speak(text) {
    if (!('speechSynthesis' in window)) return;
    
    const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = getSpeed();
        u.lang = 'en-US';
        
        // Get all available voices
        const voices = speechSynthesis.getVoices();
        const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        
        if (enVoices.length > 0) {
            // Prefer Google voices
            let selectedVoice = enVoices.find(v => v.name.includes('Google US English'));
            if (!selectedVoice) selectedVoice = enVoices.find(v => v.name.includes('Google UK English'));
            if (!selectedVoice) selectedVoice = enVoices.find(v => v.name.toLowerCase().includes('google'));
            if (!selectedVoice) selectedVoice = enVoices[0];
            
            u.voice = selectedVoice;
            console.log('Using voice:', selectedVoice.name, '(' + selectedVoice.lang + ')');
        }
        
        // Begin speaking
        window.speechSynthesis.cancel();
        isSpeaking = true;
        updateAIButtonVisuals(true);
        u.onend = () => { isSpeaking = false; updateAIButtonVisuals(false); };
        u.onerror = () => { isSpeaking = false; updateAIButtonVisuals(false); };
        window.speechSynthesis.speak(u);
    };
    
    // Chrome needs time to load voices
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = () => doSpeak();
    } else {
        doSpeak();
    }
}

/**
 * Describe the current map view
 * @param {HTMLElement} startBtn - Optional button element to disable during processing
 */
async function describeCurrentMap(startBtn) {
    const aiOutput = document.getElementById('ai-description');
    const btn = startBtn;
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Beschreibe…';
    }
    if (aiOutput) {
        aiOutput.textContent = 'Loading Audio-Transcript...';
    }
    
    try {
        const dataUrl = await captureMapAsDataUrl();
        const result = await requestDescription(dataUrl);
        const text = result?.text_data?.message || 'Keine Beschreibung verfügbar.';
        if (aiOutput) {
            aiOutput.textContent = text;
        }
        if (isAudioOn) speak(text);
    } catch (err) {
        if (aiOutput) {
            aiOutput.textContent = `Fehler: ${err.message}`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Beschreibung abrufen';
        }
    }
}

/**
 * Initialize AI description control
 * @param {L.Map} map - Leaflet map instance
 */
export function initializeAIControl(map) {
    const aiOutput = document.getElementById('ai-description');
    if (aiOutput) {
        aiOutput.textContent = 'Audio-Transcript';
    }

    // Initialize transcript toggle
    const transcriptCheckbox = document.getElementById('transcript-checkbox');
    const aiDescriptionContainer = document.getElementById('ai-description-container');
    if (transcriptCheckbox && aiDescriptionContainer) {
        transcriptCheckbox.checked = !aiDescriptionContainer.classList.contains('hidden');
        transcriptCheckbox.addEventListener('change', () => {
            aiDescriptionContainer.classList.toggle('hidden', !transcriptCheckbox.checked);
        });
    }

    // Sidebar button (if present)
    const aiButton = document.getElementById('ai-describe');
    if (aiButton) {
        aiButton.addEventListener('click', () => {
            if (isSpeaking) {
                stopAudio();
            } else {
                describeCurrentMap(aiButton);
            }
        });
    }

    // Leaflet AI control
    const AIDescribeControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-ai');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const mainBtn = L.DomUtil.create('a', 'ai-main-btn', container);
            mainBtn.href = '#';
            mainBtn.title = 'Describe Map with Audio';
            mainBtn.setAttribute('aria-label', 'Describe Map with Audio');
            mainBtn.innerHTML = '<img src="./images/speaker_icon.png" alt="" aria-hidden="true" width="18" height="18">';

            const panel = L.DomUtil.create('div', 'ai-panel', container);
            const row = L.DomUtil.create('div', 'ai-row', panel);

            // Audio toggle
            const toggleWrap = L.DomUtil.create('div', 'ai-audio-toggle', row);
            const label = L.DomUtil.create('label', 'switch', toggleWrap);
            label.setAttribute('aria-label', 'Audioausgabe ein/aus');
            const checkbox = L.DomUtil.create('input', '', label);
            checkbox.type = 'checkbox';
            checkbox.checked = isAudioOn;
            const slider = L.DomUtil.create('span', 'slider round', label);

            // Start button
            const startBtn = L.DomUtil.create('button', 'ai-start-btn', row);
            startBtn.type = 'button';
            startBtn.textContent = 'Audiobeschreibung abrufen';
            startBtn.setAttribute('aria-label', 'Start Audiodescription');

            // Events
            mainBtn.addEventListener('click', (e) => { e.preventDefault(); });
            startBtn.addEventListener('click', async () => { await describeCurrentMap(startBtn); });
            checkbox.addEventListener('change', (e) => {
                isAudioOn = !!e.target.checked;
            });

            return container;
        }
    });

    map.addControl(new AIDescribeControl({ position: 'topleft' }));

    // Reorder controls
    try {
        const corner = document.querySelector('.leaflet-top.leaflet-left');
        const aiCtrl = document.querySelector('.leaflet-control-ai');
        const layersCtrl = document.querySelector('.leaflet-control-layers');
        if (corner && aiCtrl) {
            corner.insertBefore(aiCtrl, layersCtrl || corner.firstChild);
        }
    } catch (e) {
        console.debug('AI control reorder skipped:', e);
    }

    // Main button toggle functionality
    const aiMainButton = document.querySelector('.leaflet-control-ai .ai-main-btn');
    if (aiMainButton) {
        aiMainButton.addEventListener('click', () => {
            if (isSpeaking) {
                stopAudio();
            } else {
                describeCurrentMap();
            }
        });
    }

    // Initial visuals
    updateAIButtonVisuals(false);

    // Preload voices for Chrome
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
            console.log('Voices loaded:', voices.length, 'total,', enVoices.length, 'English');
        };
    }
}
