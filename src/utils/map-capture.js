/**
 * Map Capture Utility
 * Handles capturing screenshots of the map for AI description
 */

import { baseMaps } from '../layers/basemaps.js';

/**
 * Capture the current map view as a data URL
 * @returns {Promise<string>} Data URL of the map image
 */
export async function captureMapAsDataUrl() {
    let glMap = null;
    
    // Find the currently active basemap layer
    if (window._leafletMapInstance) {
        const map = window._leafletMapInstance;
        
        // Iterate through baseMaps to find the active one
        for (const [name, baseLayer] of Object.entries(baseMaps)) {
            if (map.hasLayer(baseLayer) && baseLayer._glMap) {
                glMap = baseLayer._glMap;
                console.log('Found active GL map for layer:', name);
                break;
            }
        }
        
        // Fallback: search all layers
        if (!glMap) {
            map.eachLayer((layer) => {
                if (layer._glMap && !glMap) {
                    glMap = layer._glMap;
                    console.log('Found Mapbox GL basemap layer via eachLayer');
                }
            });
        }
    }
    
    // If we found a Mapbox GL map, capture from it
    if (glMap) {
        try {
            console.log('Attempting to capture Mapbox GL canvas');
            const glCanvas = glMap.getCanvas();
            
            if (glCanvas) {
                // Wait for rendering to complete
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if preserveDrawingBuffer is enabled
                const gl = glCanvas.getContext('webgl') || glCanvas.getContext('webgl2');
                if (gl && !gl.getContextAttributes().preserveDrawingBuffer) {
                    console.error('preserveDrawingBuffer is false! Canvas export will fail.');
                    console.warn('Please reload the page for the fix to take effect.');
                }
                
                // Try to get the image data directly from the canvas
                const dataUrl = glCanvas.toDataURL('image/png');
                console.log('Successfully captured from Mapbox GL canvas, data URL length:', dataUrl.length);
                
                // Validate that we didn't get an empty/gray image
                if (dataUrl.length < 1000) {
                    console.error('Captured image seems too small, falling back to html2canvas');
                    throw new Error('Canvas capture produced invalid image');
                }
                
                return dataUrl;
            } else {
                console.warn('Mapbox GL canvas not found');
            }
        } catch (error) {
            console.error('Failed to capture Mapbox GL canvas:', error);
            console.warn('Falling back to html2canvas');
        }
    } else {
        console.warn('No Mapbox GL map found, using html2canvas fallback');
    }
    
    // Fallback: use html2canvas for the entire map element
    console.log('Using html2canvas for map capture');
    const mapEl = document.getElementById('map');
    
    // html2canvas is loaded globally from CDN
    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library not loaded');
    }
    
    const canvas = await html2canvas(mapEl, { 
        useCORS: true, 
        backgroundColor: null, 
        scale: 1,
        logging: false
    });
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Successfully captured with html2canvas, data URL length:', dataUrl.length);
    return dataUrl;
}
