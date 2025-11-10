/**
 * Map Capture Utility
 * Handles capturing screenshots of the map for AI description
 */

/**
 * Capture the current map view as a data URL
 * @returns {Promise<string>} Data URL of the map image
 */
export async function captureMapAsDataUrl() {
    // Try to find any active Mapbox GL layer (2D or 3D mode)
    let glMap = null;
    
    // Check for 3D mode layer
    if (window._mapbox3DLayer && window._mapbox3DLayer._glMap) {
        glMap = window._mapbox3DLayer._glMap;
        console.log('3D mode layer found');
    }
    
    // If no 3D layer, search for active basemap GL layer
    if (!glMap && window._leafletMapInstance) {
        const map = window._leafletMapInstance;
        map.eachLayer((layer) => {
            if (layer._glMap && !glMap) {
                glMap = layer._glMap;
                console.log('Found Mapbox GL basemap layer');
            }
        });
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
                return dataUrl;
            } else {
                console.warn('Mapbox GL canvas not found');
            }
        } catch (error) {
            console.error('Failed to capture Mapbox GL canvas:', error);
            console.warn('Falling back to html2canvas');
        }
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
        logging: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Successfully captured with html2canvas, data URL length:', dataUrl.length);
    return dataUrl;
}
