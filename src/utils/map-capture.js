/**
 * Map Capture Utility
 * Handles capturing screenshots of the map for AI description
 */

/**
 * Capture the current map view as a data URL
 * @returns {Promise<string>} Data URL of the map image
 */
export async function captureMapAsDataUrl() {
    // Check if 3D mode is active - if so, capture from Mapbox GL canvas
    if (window._mapbox3DLayer && window._mapbox3DLayer._glMap) {
        try {
            console.log('3D mode detected, attempting to capture Mapbox GL canvas');
            const glMap = window._mapbox3DLayer._glMap;
            const glCanvas = glMap.getCanvas();
            
            if (glCanvas) {
                // Wait a moment to ensure the canvas is fully rendered
                await new Promise(resolve => setTimeout(resolve, 500));
                
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
    
    // Default: use html2canvas for 2D Leaflet view
    console.log('Using html2canvas for 2D Leaflet map');
    const mapEl = document.getElementById('map');
    
    // html2canvas is loaded globally from CDN
    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library not loaded');
    }
    
    const canvas = await html2canvas(mapEl, { 
        useCORS: true, 
        backgroundColor: null, 
        scale: 1 
    });
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Successfully captured with html2canvas, data URL length:', dataUrl.length);
    return dataUrl;
}
