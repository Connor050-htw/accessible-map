/**
 * 3D Buildings Module
 * Handles adding 3D building extrusions to Mapbox GL styles
 */

/**
 * Remove 3D building layer from the map
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 */
export function remove3DBuildings(mapboxMap) {
    if (!mapboxMap) return;
    
    try {
        // Remove the 3d-buildings layer if it exists
        if (mapboxMap.getLayer('3d-buildings')) {
            mapboxMap.removeLayer('3d-buildings');
            console.log('3D buildings layer removed');
        }
    } catch (err) {
        console.error('Error removing 3D buildings:', err);
    }
}

/**
 * Add 3D building extrusions to a Mapbox GL map
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 * @param {boolean} setInitialCamera - Whether to set initial camera position (default: true)
 */
export function add3DBuildings(mapboxMap, setInitialCamera = true) {
    // Wait for style to be fully loaded
    if (!mapboxMap.isStyleLoaded()) {
        console.log('Style not yet loaded, waiting...');
        mapboxMap.once('styledata', () => add3DBuildings(mapboxMap, setInitialCamera));
        return;
    }
    
    console.log('Adding 3D building layer...');
    
    if (mapboxMap.getLayer('3d-buildings')) {
        mapboxMap.removeLayer('3d-buildings');
    }
    
    const { buildingSource, buildingSourceLayer } = detectBuildingSource(mapboxMap);
    
    if (!buildingSource) {
        console.warn('No building source found in current style');
        return;
    }

    const labelLayerId = findLabelLayer(mapboxMap);
    const hasExtrusions = checkExistingExtrusions(mapboxMap);
    
    if (!hasExtrusions) {
        try {
            mapboxMap.addLayer({
                id: '3d-buildings',
                source: buildingSource,
                'source-layer': buildingSourceLayer,
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                    'fill-extrusion-color': '#aaaaaa',
                    'fill-extrusion-opacity': 0.85,
                    'fill-extrusion-height': [
                        'interpolate', ['linear'], ['zoom'],
                        15, 0,
                        15.05, ['coalesce', ['get', 'height'], 10]
                    ],
                    'fill-extrusion-base': [
                        'interpolate', ['linear'], ['zoom'],
                        15, 0,
                        15.05, ['coalesce', ['get', 'min_height'], 0]
                    ]
                }
            }, labelLayerId);
            console.log('3D buildings layer added successfully!');
        } catch (err) {
            console.error('Could not add 3D building layer:', err, { buildingSource, buildingSourceLayer });
        }
    } else {
        console.log('Style already has 3D building extrusions');
    }
    
    if (setInitialCamera) {
        mapboxMap.setPitch(60);
        // Ensure initial bearing faces due north when entering 3D
        mapboxMap.setBearing(0);
    }
    
    configure3DControls(mapboxMap);
}

/**
 * Detect building source and source-layer from the current style
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 * @returns {Object} { buildingSource, buildingSourceLayer }
 */
function detectBuildingSource(mapboxMap) {
    const style = mapboxMap.getStyle();
    const layers = style.layers || [];
    
    // Try to detect building source from existing building layers
    let buildingSource = null;
    let buildingSourceLayer = 'building';
    
    for (let i = 0; i < layers.length; i++) {
        const lyr = layers[i];
        if (!lyr.source || !lyr['source-layer']) continue;
        const sl = String(lyr['source-layer']).toLowerCase();
        if (sl.includes('building')) {
            buildingSource = lyr.source;
            buildingSourceLayer = lyr['source-layer'];
            break;
        }
    }
    
    // Fallback: try common vector tile source names
    if (!buildingSource && style.sources) {
        const srcNames = Object.keys(style.sources);
        if (srcNames.includes('composite')) buildingSource = 'composite';
        else if (srcNames.includes('openmaptiles')) buildingSource = 'openmaptiles';
        else if (srcNames.includes('jawg')) buildingSource = 'jawg';
        else if (srcNames.length) buildingSource = srcNames[0];
    }
    
    return { buildingSource, buildingSourceLayer };
}

/**
 * Find the first symbol layer with text to insert buildings beneath labels
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 * @returns {string|undefined} Layer ID or undefined
 */
function findLabelLayer(mapboxMap) {
    const layers = mapboxMap.getStyle().layers || [];
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
            return layers[i].id;
        }
    }
    return undefined;
}

/**
 * Check if the style already has fill-extrusion layers for buildings
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 * @returns {boolean}
 */
function checkExistingExtrusions(mapboxMap) {
    const layers = mapboxMap.getStyle().layers || [];
    return layers.some(l => 
        l.type === 'fill-extrusion' && 
        (l['source-layer'] || '').toLowerCase().includes('building')
    );
}

/**
 * Configure controls for better 3D usability
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 */
function configure3DControls(mapboxMap) {
    try {
        if (mapboxMap.dragPan) {
            mapboxMap.dragPan.disable();
        }
        
        if (mapboxMap.doubleClickZoom) {
            mapboxMap.doubleClickZoom.disable();
        }
        
        if (mapboxMap.dragRotate) {
            mapboxMap.dragRotate.disable();
        }
        
        setupBearingAwarePanning(mapboxMap);
        setupRotationAndPitchControl(mapboxMap);
        
        if (mapboxMap.touchZoomRotate) {
            mapboxMap.touchZoomRotate.enableRotation();
            console.log('Touch rotation enabled');
        }
        if (mapboxMap.touchPitch) {
            mapboxMap.touchPitch.enable();
            console.log('Touch pitch enabled');
        }
        
        if (mapboxMap.scrollZoom) {
            mapboxMap.scrollZoom.setWheelZoomRate(1/200);
        }
        
        if (mapboxMap.keyboard) {
            mapboxMap.keyboard.enable();
        }
        
        console.log('3D Controls:');
        console.log('- Left-click+drag: Pan map');
        console.log('- Right-click+drag: Rotate (horizontal) and tilt (vertical)');
        console.log('- Scroll: Zoom');
    } catch (e) {
        console.error('Error enabling 3D controls:', e);
    }
}

/**
 * Setup bearing-aware panning so map pans relative to screen, not north
 * This makes dragging intuitive even when the map is rotated
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 */
function setupBearingAwarePanning(mapboxMap) {
    let isPanning = false;
    let lastX, lastY;
    
    const canvas = mapboxMap.getCanvas();
    canvas.style.cursor = 'grab';
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && !e.ctrlKey) {
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    const handleMouseMove = (e) => {
        if (!isPanning) return;
        
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        
        // Rotate mouse movement by current bearing to make panning screen-relative
        // This ensures dragging up always moves the map up on screen, regardless of rotation
        const bearingRad = mapboxMap.getBearing() * Math.PI / 180;
        const cos = Math.cos(bearingRad);
        const sin = Math.sin(bearingRad);
        const rotatedDx = dx * cos + dy * sin;
        const rotatedDy = -dx * sin + dy * cos;
        
        // Pan by rotated movement (negative because drag is opposite to pan direction)
        mapboxMap.panBy([-rotatedDx, -rotatedDy], { 
            animate: false,
            duration: 0
        });
        
        lastX = e.clientX;
        lastY = e.clientY;
    };
    
    const handleMouseUp = (e) => {
        if (isPanning && e.button === 0) {
            isPanning = false;
            canvas.style.cursor = 'grab';
        }
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    document.addEventListener('mouseup', handleMouseUp); // Catch mouseup outside canvas
}

/**
 * Setup rotation (horizontal) and pitch (vertical) control with right-click
 * @param {mapboxgl.Map} mapboxMap - The Mapbox GL map instance
 */
function setupRotationAndPitchControl(mapboxMap) {
    let isRotating = false;
    let lastX, lastY;
    
    const canvas = mapboxMap.getCanvas();
    
    canvas.addEventListener('mousedown', (e) => {
        // Right-click or Ctrl+Left-click triggers rotation/pitch mode
        if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
            isRotating = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'move';
            e.preventDefault();
        }
    });
    
    const handleMouseMove = (e) => {
        if (!isRotating) return;
        
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        
        const currentBearing = mapboxMap.getBearing();
        const currentPitch = mapboxMap.getPitch();
        
        // Sensitivity: degrees per pixel of mouse movement
        const bearingSensitivity = 0.5;
        const pitchSensitivity = 0.3;
        
        // Horizontal movement controls bearing (rotation around z-axis)
        // Inverted to match intuitive drag direction
        const newBearing = currentBearing + (dx * bearingSensitivity);
        
        // Vertical movement controls pitch (tilt), clamped between 0 and 85 degrees
        const newPitch = Math.max(0, Math.min(85, currentPitch - (dy * pitchSensitivity)));
        
        mapboxMap.setBearing(newBearing);
        mapboxMap.setPitch(newPitch);
        
        lastX = e.clientX;
        lastY = e.clientY;
    };
    
    const handleMouseUp = (e) => {
        if (isRotating && (e.button === 2 || (e.button === 0 && e.ctrlKey))) {
            isRotating = false;
            canvas.style.cursor = 'grab';
        }
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', () => {
        if (isRotating) {
            isRotating = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', handleMouseUp);
}
