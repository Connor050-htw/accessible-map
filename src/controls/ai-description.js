/**
 * AI Description Control Module
 * Handles AI-powered audio description of the map
 */

import { AI_API_BASE } from '../core/config.js';
import { captureMapAsDataUrl } from '../utils/map-capture.js';

let isAudioOn = true;
let isSpeaking = false;
let useGermanAudio = false;

/**
 * Update audio button icon based on speaking state
 */
function updateAudioButtonIcon() {
    const btn = document.querySelector('.leaflet-control-ai .ai-main-btn');
    if (!btn) return;
    
    const icon = isSpeaking ? 'speaker_mute_icon.png' : 'speaker_icon.png';
    const title = isSpeaking ? 'Stop Audio' : 'Start Audiodescription';
    
    btn.innerHTML = `<img src="./images/${icon}" alt="" aria-hidden="true" width="18" height="18">`;
    btn.title = title;
    btn.setAttribute('aria-label', title);
}

/**
 * Stop audio playback
 */
export function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        updateAudioButtonIcon();
        console.log('Audio stopped');
    }
}

/**
 * Request description from AI API
 * @param {string} imageDataUrl - Base64 data URL of map image
 * @returns {Promise<Object>} API response
 */
async function requestDescription(imageDataUrl) {
    const body = {
        data_url: imageDataUrl,
        language: useGermanAudio ? 'de' : 'en'
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
        u.lang = useGermanAudio ? 'de-DE' : 'en-US';
        
        // Get all available voices
        const voices = speechSynthesis.getVoices();
        const langVoices = useGermanAudio 
            ? voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'))
            : voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        
        if (langVoices.length > 0) {
            let selectedVoice;
            if (useGermanAudio) {
                // Prefer Google German voices
                selectedVoice = langVoices.find(v => v.name.includes('Google Deutsch'));
                if (!selectedVoice) selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('google'));
                if (!selectedVoice) selectedVoice = langVoices[0];
            } else {
                // Prefer Google English voices
                selectedVoice = langVoices.find(v => v.name.includes('Google US English'));
                if (!selectedVoice) selectedVoice = langVoices.find(v => v.name.includes('Google UK English'));
                if (!selectedVoice) selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('google'));
                if (!selectedVoice) selectedVoice = langVoices[0];
            }
            
            u.voice = selectedVoice;
            console.log('Using voice:', selectedVoice.name, '(' + selectedVoice.lang + ')');
        }
        
        // Begin speaking
        window.speechSynthesis.cancel();
        isSpeaking = true;
        updateAudioButtonIcon();
        u.onend = () => { 
            isSpeaking = false; 
            updateAudioButtonIcon();
        };
        u.onerror = () => { 
            isSpeaking = false; 
            updateAudioButtonIcon();
        };
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

    // Initialize language toggle
    const languageCheckbox = document.getElementById('language-checkbox');
    const languageLabel = document.getElementById('language-label');
    if (languageCheckbox) {
        languageCheckbox.checked = useGermanAudio;
        if (languageLabel) {
            languageLabel.textContent = useGermanAudio ? 'Deutsch' : 'English';
        }
        languageCheckbox.addEventListener('change', () => {
            useGermanAudio = languageCheckbox.checked;
            if (languageLabel) {
                languageLabel.textContent = useGermanAudio ? 'Deutsch' : 'English';
            }
            console.log('Audio language:', useGermanAudio ? 'German (de-DE)' : 'English (en-US)');
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

    // Leaflet AI control button
    const AIDescribeControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-ai');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const mainBtn = L.DomUtil.create('button', 'ai-main-btn', container);
            mainBtn.type = 'button';
            mainBtn.title = 'Start Audiodescription';
            mainBtn.setAttribute('aria-label', 'Start Audiodescription');
            mainBtn.innerHTML = '<img src="./images/speaker_icon.png" alt="" aria-hidden="true" width="18" height="18">';

            // Events - Toggle between start and stop
            mainBtn.addEventListener('click', async () => { 
                if (isSpeaking) {
                    stopAudio();
                } else {
                    await describeCurrentMap(); 
                }
            });

            return container;
        }
    });

    map.addControl(new AIDescribeControl({ position: 'topleft' }));

    // Reorder controls to: Zoom, Fullscreen, Audio, Layers
    // Use setTimeout to ensure all controls are added
    setTimeout(() => {
        try {
            const corner = document.querySelector('.leaflet-top.leaflet-left');
            const zoomCtrl = document.querySelector('.leaflet-control-zoom');
            const fullscreenCtrl = document.querySelector('.leaflet-control-fullscreen');
            const aiCtrl = document.querySelector('.leaflet-control-ai');
            const layersCtrl = document.querySelector('.leaflet-control-layers');
            
            if (corner) {
                // Remove all controls from corner
                const controls = [zoomCtrl, fullscreenCtrl, aiCtrl, layersCtrl].filter(ctrl => ctrl);
                
                // Clear corner
                controls.forEach(ctrl => {
                    if (ctrl && ctrl.parentNode === corner) {
                        corner.removeChild(ctrl);
                    }
                });
                
                // Re-add in correct order: Zoom, Fullscreen, Audio, Layers
                if (zoomCtrl) corner.appendChild(zoomCtrl);
                if (fullscreenCtrl) corner.appendChild(fullscreenCtrl);
                if (aiCtrl) corner.appendChild(aiCtrl);
                if (layersCtrl) corner.appendChild(layersCtrl);
                
                console.log('Controls reordered: Zoom → Fullscreen → Audio → Layers');
            }
        } catch (e) {
            console.debug('Control reorder skipped:', e);
        }
    }, 100);

    // Preload voices for Chrome
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
            const deVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
            console.log('Voices loaded:', voices.length, 'total,', enVoices.length, 'English,', deVoices.length, 'German');
        };
    }
}
