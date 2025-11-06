// Define map layers
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">OpenStreetMap</a>'
});

const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
});

const key = 'fTqz035OSDg9GsUaD2Fu';

const mtLayerDataviz = L.tileLayer(`https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${key}`,{
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" aria-label="MapTiler attribution. Opens in a new tab" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap contributors</a>',
});

const mtLayerToner = L.tileLayer(`https://api.maptiler.com/maps/toner-v2/{z}/{x}/{y}.png?key=${key}`, {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '<a href="https://www.maptiler.com/copyright/" aria-label="MapTiler attribution. Opens in a new tab" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" aria-label="OpenStreetMap attribution. Opens in a new tab" target="_blank">&copy; OpenStreetMap contributors</a>',
});

const jawgLight = L.tileLayer('https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token=72PfAsavPGBrPQf2FE0JOoybXUoXPpap3zQOpRhL0bsmh5CK4eilk2S9zcq3xAra', {
    maxZoom: 22,
    crossOrigin: true,
    attribution: '<a href=\"https://www.jawg.io?utm_medium=map&utm_source=attribution\" aria-label="Jawg attribution. Opens in a new tab" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg\" aria-label="OpenStreetMap attribution. Opens in a new tab" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors"'
});

const jawgDark = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=72PfAsavPGBrPQf2FE0JOoybXUoXPpap3zQOpRhL0bsmh5CK4eilk2S9zcq3xAra', {
    maxZoom: 22,
    crossOrigin: true,
    attribution: '<a href=\"https://www.jawg.io?utm_medium=map&utm_source=attribution\" aria-label="Jawg attribution. Opens in a new tab" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg\" aria-label="OpenStreetMap attribution. Opens in a new tab" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors"'
});

const baseMaps = {
    "OpenStreetMap": osm,
    "OpenStreetMap.HOT": osmHOT,
    "MapTiler Dataviz": mtLayerDataviz,
    "MapTiler Toner": mtLayerToner,
    "Jawg Light": jawgLight,
    "Jawg Dark": jawgDark

};


// Create map
var map = L.map('map',
    {
        attributionControl: true,
        setPrefix: false,
        layers: [jawgLight]
    }
).setView([47.69, 13.38], 7);

// Mapbox configuration for 3D buildings
// The token is loaded from mapbox-config.js (global window.MAPBOX_TOKEN)
const MAPBOX_TOKEN = (typeof window !== 'undefined' && window.MAPBOX_TOKEN) ? window.MAPBOX_TOKEN : 'YOUR_MAPBOX_TOKEN';

// Mapbox 3D layer - will be initialized on demand
var mapbox3DLayer = null;
var buildings3DEnabled = false;

// Store references to POI markers and labels for hiding/showing in 3D mode
var poiMarkers = [];
var poiLabels = [];

// Add data to map
fetch('./data/austriancastles.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            filter: function (castle) {
                let isAttraction = castle.properties.tourism === 'attraction';
                let hasImg = castle.properties['img_file'] !== null;
                let hasDescription = castle.properties['description-translated'] !== null;
                let isNotRuin = castle.properties.ruins === 'no' || castle.properties.ruins === null;
                return isNotRuin && isAttraction && hasImg && hasDescription;
            },

            pointToLayer: function (castle, latlng) {
                const markerOptions = {
                    title: castle.properties.name,
                    alt: castle.properties.name,
                    //icon: L.icon({iconUrl: './images/circle-castle-icon.png', iconSize: [28, 41]}),
                };
                const marker = L.marker(latlng, markerOptions);
                poiMarkers.push(marker); // Store marker reference
                return marker;
            },

            onEachFeature: function (castle, layer) {
                layer.bindPopup(
                    `<h2>${castle.properties.name}</h2>
                    <img src="${castle.properties["img_file"]}" alt="">
                    <p>${castle.properties['description-translated']}</p>`
                );

                //layer.bindTooltip(castle.properties.name)

                //Add labels to markers
                let label = L.divIcon({
                    className: 'label',
                    html: castle.properties.name,
                });

                const labelMarker = L.marker([castle.geometry.coordinates[1], castle.geometry.coordinates[0]], {
                    icon: label
                }).addTo(map);
                
                poiLabels.push(labelMarker); // Store label reference

                // focus leaflet-popup on marker click
                layer.on('click', focusPopup);
                layer.on('keypress', (event) => {
                    if (event.originalEvent.key === 'Enter') {
                        focusPopup();
                    }
                });
            }
        }).addTo(map);

        // PinSearch component
        L.control.pinSearch({
            position: 'topright',
            placeholder: 'Search castle',
            buttonText: 'Search',
            onSearch: function (query) {
                // Handle the search query here
                const results = data.features.filter(feature =>
                    feature.properties.name.toLowerCase().includes(query.toLowerCase())
                );
                map.setView([results[0].geometry.coordinates[1], results[0].geometry.coordinates[0]], 12);
            },

            searchBarWidth: '250px',
            searchBarHeight: '35px',
            maxSearchResults: 5
        }).addTo(map);

    });
    


//Add fullscreen control
L.control
    .fullscreen({
        position: 'topleft', 
        title: 'Open map in fullscreen mode', 
        titleCancel: 'Exit fullscreen mode',
        forceSeparateButton: true,
        forcePseudoFullscreen: false,
        fullscreenElement: false
    })
    .addTo(map);

map.on('enterFullscreen', function () {
    let fullscreenElement = document.querySelector('.leaflet-fullscreen-on');
    fullscreenElement.setAttribute('aria-label', 'Exit fullscreen mode');
});

map.on('exitFullscreen', function () {
    let fullscreenElement = document.querySelector('.fullscreen-icon');
    fullscreenElement.setAttribute('aria-label', 'Open map in fullscreen mode');
});

// Add layer control (kept here so sidebar basemap bindings find it in DOM)
var layerControl = L.control.layers(baseMaps).setPosition('topleft').addTo(map);

// Add keyboard shortcuts to attribution control
map.attributionControl.addAttribution(
    '<button id="shortcuts-button" aria-label="Keyboard Shortcuts">Keyboard Shortcuts</button>'
);


function focusPopup() {
    let popup = document.querySelector('.leaflet-popup-content');
    popup.style.padding = '5px';
    popup.setAttribute('tabindex', '0');
    popup.focus();
}

// Close popup with escape key
map.on('keydown', (event) => {
    try{
    if (event.originalEvent.key === 'Escape' && document.querySelector('.search-results').style.display === 'block') {
        document.querySelector('.search-results').style.display = 'none';
    }
     else if (event.originalEvent.key === 'Escape' && map.hasLayer(map._popup)) {
        map.closePopup();
    }
    } catch (error) {
        console.log('No popup or search results open');
    }
    
});

// save and return focus to the last focused element after closing the popup
map.on('popupopen', () => {
    let lastFocusedElement = document.activeElement;
    map.on('popupclose',  () => lastFocusedElement.focus());
});

// if popup is open + and - keys zoom in and out
map.on('popupopen', () => {
    document.addEventListener('keydown', (event) => {
        if (event.key === '+' || event.key === '=') {
            map.zoomIn();
        } else if (event.key === '-') {
            map.zoomOut();
        }
    });
});

// if popup is open, arrow keys move the map
map.on('popupopen', () => {
    focusPopup();
    document.querySelector('.search-results').style.display = 'none';
    let main = document.querySelector('main');

    if (map.hasLayer(map._popup)) {   
            main.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                map.panBy([0, -100]);
            } else if (event.key === 'ArrowDown') {
                map.panBy([0, 100]);
            } else if (event.key === 'ArrowLeft') {
                map.panBy([-100, 0]);
            } else if (event.key === 'ArrowRight') {
                map.panBy([100, 0]);
            }
        });
    }
});

//hide tooltip from screen readers
document.getElementsByClassName('leaflet-tooltip-pane')[0].setAttribute('aria-hidden', 'true');

//remove marker aria-describedby from markers
document.querySelectorAll('.leaflet-marker-icon').forEach(marker => marker.removeAttribute('aria-describedby'));

// use shift + f to focus the search bar on document
document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.code === 'KeyF') {
        event.preventDefault();
        let searchInput = document.querySelector('.search-input');
        searchInput.focus();
        searchInput.value = '';
    }
});

// DOM manipulation
// Hide / show keyboard shortcuts
let shortcuts = document.getElementById('keyboard-shortcuts-view');
let wrapper = document.getElementById('shortcuts-wrapper');
let shortcutsButton = document.getElementById('shortcuts-button');

function showShortcuts() {
    shortcuts.style.display = 'block';
    wrapper.style.display = 'block';
    shortcuts.focus();
}

function closeShortcuts() {
    shortcuts.style.display = 'none';
    wrapper.style.display = 'none';
}

// Use event delegation so the handler survives DOM changes (e.g., after 3D toggle)
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

// Increase / decrease font size
let fontSize = 16;
let increaseBtn = document.getElementById('increase-font-size');
let decreaseBtn = document.getElementById('decrease-font-size');

function increaseFontSize() {
    fontSize += 2;
    document.documentElement.style.fontSize = fontSize + 'px';
    document.body.style.gridTemplateRows = 'auto max-content';
}

function decreaseFontSize() {
    fontSize -= 2;
    document.documentElement.style.fontSize = fontSize + 'px';
}

increaseBtn.addEventListener('click', increaseFontSize);
decreaseBtn.addEventListener('click', decreaseFontSize);

// Toggle high contrast mode
let highContrastBtn = document.getElementById('contrast-checkbox');

function toggleHighContrast() {
    highContrastBtn.checked ?
    document.body.classList.add('high-contrast') :
    document.body.classList.remove('high-contrast');
}

highContrastBtn.addEventListener('change', toggleHighContrast);

//if body has high contrast class, add filter: invert() to popup image
map.on('popupopen', () => {
    if (document.body.classList.contains('high-contrast')) {
        document.querySelector('.leaflet-popup-content img').style.filter = 'invert()';
    }
});

// Toggle labels
let labelsBtn = document.getElementById('labels-checkbox');

labelsBtn.addEventListener('change', () => {
    labelsBtn.checked ?
    document.querySelectorAll('.label').forEach(
        label => {
            label.style.display = 'block';
            label.removeAttribute('tabindex');
        }) 
    : document.querySelectorAll('.label').forEach(label => label.style.display = 'none');
});

// Toggle 3D view (checked = enable 3D buildings via Mapbox)
let view3DBtn = document.getElementById('3d-view-checkbox');
let originalBasemap = null; // Store the current basemap
let currentBasemapName = null; // Store which basemap was active

view3DBtn.addEventListener('change', () => {
    if (view3DBtn.checked) {
        console.log('3D View aktiviert - Zoom Level:', map.getZoom());
        
        // Check if token is set
        if (MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
            alert('Bitte setze deinen Mapbox Access Token in script.js (Zeile 60).\n\nKostenlos erhältlich auf: https://account.mapbox.com/');
            view3DBtn.checked = false;
            return;
        }
        
        buildings3DEnabled = true;
        
        if (!mapbox3DLayer) {
            try {
                // Set access token
                mapboxgl.accessToken = MAPBOX_TOKEN;
                
                // Get current map state
                const center = map.getCenter();
                const zoom = Math.max(map.getZoom(), 15);
                
                // Store current basemap and remove all tile layers
                map.eachLayer((layer) => {
                    if (layer instanceof L.TileLayer) {
                        originalBasemap = layer;
                        // Find which basemap it is
                        for (let [name, baseLayer] of Object.entries(baseMaps)) {
                            if (baseLayer === layer) {
                                currentBasemapName = name;
                                break;
                            }
                        }
                        map.removeLayer(layer);
                        console.log('Leaflet Basemap entfernt:', currentBasemapName);
                    }
                });
                
                // Hide POI markers and labels in 3D mode
                console.log('Verstecke', poiMarkers.length, 'POI-Marker und', poiLabels.length, 'Labels');
                poiMarkers.forEach(marker => {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                    }
                });
                poiLabels.forEach(label => {
                    if (map.hasLayer(label)) {
                        map.removeLayer(label);
                    }
                });
                
                // Create Mapbox GL layer with proper configuration
                mapbox3DLayer = L.mapboxGL({
                    accessToken: MAPBOX_TOKEN,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    pane: 'tilePane',
                    // Optimize for smooth panning after rotation
                    interactive: true,
                    dragRotate: true,
                    pitchWithRotate: false,
                    touchPitch: true,
                    touchZoomRotate: true,
                    // Performance optimizations
                    updateInterval: 32, // ~30fps update rate for smoother rendering
                    bearingSnap: 7, // Less snapping for smoother rotation
                    renderWorldCopies: false, // Better performance
                    // Enable canvas preservation for screenshots
                    preserveDrawingBuffer: true
                }).addTo(map);
                
                console.log('Mapbox 3D Layer hinzugefügt');
                
                // Wait for the mapbox map to be ready
                setTimeout(() => {
                    try {
                        const mapboxMap = mapbox3DLayer.getMapboxMap();
                        
                        if (mapboxMap && mapboxMap.isStyleLoaded()) {
                            console.log('Mapbox Style geladen, füge 3D-Gebäude hinzu...');
                            add3DBuildings(mapboxMap);
                        } else {
                            mapboxMap.once('load', () => {
                                console.log('Mapbox Map Load Event, füge 3D-Gebäude hinzu...');
                                add3DBuildings(mapboxMap);
                            });
                        }
                    } catch (e) {
                        console.error('Fehler beim Zugriff auf Mapbox Map:', e);
                    }
                }, 1000);
                
                // Zoom to appropriate level
                if (map.getZoom() < 15) {
                    console.log('Zooming to level 15 for 3D buildings');
                    map.setZoom(15);
                }
                
                    // Show compass
                    showCompass();
                
            } catch (error) {
                console.error('Fehler beim Laden von Mapbox 3D:', error);
                alert('3D-Gebäude konnten nicht geladen werden: ' + error.message);
                view3DBtn.checked = false;
                buildings3DEnabled = false;
            }
        }
    } else {
        // Disable 3D buildings
        buildings3DEnabled = false;
        console.log('3D View deaktiviert');
        
        if (mapbox3DLayer) {
            try {
                map.removeLayer(mapbox3DLayer);
                mapbox3DLayer = null;
                console.log('Mapbox 3D Layer entfernt');
                
                // Restore original basemap
                if (originalBasemap) {
                    originalBasemap.addTo(map);
                    console.log('Leaflet Basemap wiederhergestellt:', currentBasemapName);
                } else if (currentBasemapName && baseMaps[currentBasemapName]) {
                    // Fallback: add by name if reference was lost
                    baseMaps[currentBasemapName].addTo(map);
                    console.log('Leaflet Basemap via Name wiederhergestellt:', currentBasemapName);
                } else {
                    // Last resort: add default layer
                    jawgLight.addTo(map);
                    console.log('Default Basemap wiederhergestellt');
                }
                
                // Show POI markers and labels again
                console.log('Zeige', poiMarkers.length, 'POI-Marker und', poiLabels.length, 'Labels wieder an');
                poiMarkers.forEach(marker => {
                    if (!map.hasLayer(marker)) {
                        marker.addTo(map);
                    }
                });
                poiLabels.forEach(label => {
                    if (!map.hasLayer(label)) {
                        label.addTo(map);
                    }
                });
                
                // Trigger layer control update
                map.fire('baselayerchange', { layer: originalBasemap || jawgLight });
                
                    // Hide compass
                    hideCompass();
                
            } catch (error) {
                console.error('Fehler beim Entfernen von Mapbox 3D:', error);
            }
        }
    }
});

// Helper function to add 3D buildings to Mapbox map
function add3DBuildings(mapboxMap) {
    // Wait a bit for style to be fully loaded
    if (!mapboxMap.isStyleLoaded()) {
        console.log('Style noch nicht geladen, warte...');
        mapboxMap.once('styledata', () => add3DBuildings(mapboxMap));
        return;
    }
    
    console.log('Füge 3D-Building Layer hinzu...');
    
    // Remove existing 3d-buildings layer if it exists
    if (mapboxMap.getLayer('3d-buildings')) {
        mapboxMap.removeLayer('3d-buildings');
    }
    
    // Add 3D building layer
    const layers = mapboxMap.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }
    
    mapboxMap.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8
        }
    }, labelLayerId);
    
    // Set initial pitch and bearing for 3D view
    mapboxMap.setPitch(60);
    mapboxMap.setBearing(-17.6);
    
    // Configure controls for better usability and performance
    try {
        // Ensure drag pan has priority and is smooth
        if (mapboxMap.dragPan) {
            mapboxMap.dragPan.enable();
            // Disable inertia for more precise control (reduces jitter)
            mapboxMap.dragPan.disable();
            mapboxMap.dragPan.enable();
        }
        
        // Disable double-click zoom to prevent conflicts
        if (mapboxMap.doubleClickZoom) {
            mapboxMap.doubleClickZoom.disable();
        }
        
        // Enable rotation only with right-click or Ctrl+left-click
        if (mapboxMap.dragRotate) {
            mapboxMap.dragRotate.enable();
            console.log('Drag rotate aktiviert (Rechtsklick oder Strg+Linksklick)');
        }
        
        // Enable touch controls
        if (mapboxMap.touchZoomRotate) {
            mapboxMap.touchZoomRotate.enableRotation();
            console.log('Touch rotation aktiviert');
        }
        if (mapboxMap.touchPitch) {
            mapboxMap.touchPitch.enable();
            console.log('Touch pitch aktiviert');
        }
        
        // Smooth scrolling
        if (mapboxMap.scrollZoom) {
            mapboxMap.scrollZoom.setWheelZoomRate(1/200); // Smoother zoom
        }
        
        // Keyboard shortcuts for rotation
        if (mapboxMap.keyboard) {
            mapboxMap.keyboard.enable();
        }
        
        console.log('3D-Gebäude Layer erfolgreich hinzugefügt!');
        console.log('Steuerung:');
        console.log('- Linksklick+Ziehen: Karte verschieben (Pan)');
        console.log('- Rechtsklick+Ziehen: Karte drehen/neigen');
        console.log('- Strg+Linksklick+Ziehen: Alternative zum Drehen');
        console.log('- Scroll: Zoom');
    } catch (e) {
        console.error('Fehler beim Aktivieren der 3D-Steuerung:', e);
    }
}

// Toggle simplified map mode
let simplifiedMapBtn = document.getElementById('simplified-checkbox');

simplifiedMapBtn.addEventListener('change', () => {
    const mapElement = document.getElementById('map');
    if (simplifiedMapBtn.checked) {
        mapElement.classList.add('simplified-map');
    } else {
        mapElement.classList.remove('simplified-map');
    }
});

// Change basemap layer with basemap-selector-buttons
const basemapSelectors = document.querySelectorAll('.basemap-selector-button');

// Function to update basemap selection
function updateBasemapSelection() {
    const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
    
    basemapLayers.forEach((layer, index) => {
        if (layer.checked && basemapSelectors[index]) {
            basemapSelectors[index].classList.add('selected');
        }
    });
}

// Add click handlers to sidebar buttons
basemapSelectors.forEach((selector, index) => {
    selector.addEventListener('click', () => {
        // Re-query the layer control elements in case they changed
        const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
        if (basemapLayers[index]) {
            basemapLayers[index].click();
        }
    });
});

// Watch for layer changes and update visual selection
map.on('baselayerchange', () => {
    const basemapLayers = document.querySelectorAll('.leaflet-control-layers-selector');
    basemapLayers.forEach((layer, index) => {
        if (layer.checked && basemapSelectors[index]) {
            basemapSelectors.forEach(sel => sel.classList.remove('selected'));
            basemapSelectors[index].classList.add('selected');
        }
    });
});

// Initial update
updateBasemapSelection();

// Show / hide sidebar with .sidebarbutton
let sidebarButton = document.getElementById('sidebar-button');
let sidebar = document.getElementById('sidebar');
let mobileScreen = window.matchMedia('(max-width: 768px)').matches;

mobileScreen ? sidebarButton.firstElementChild.innerHTML = '>' : sidebarButton.firstElementChild.innerHTML = '<';

sidebarButton.addEventListener('click', () => {
    mobileScreen ?
    sidebar.classList.toggle('displayed') :
    sidebar.classList.toggle('hidden');

    document.body.classList.toggle('hidden-sidebar');
    
    mobileScreen ?
    sidebarButton.firstElementChild.innerHTML = sidebar.classList.contains('displayed') ? '<' : '>' :
    sidebarButton.firstElementChild.innerHTML = sidebar.classList.contains('hidden') ? '>' : '<';

    sidebar.classList.contains('hidden') ? 
    sidebarButton.setAttribute('aria-label', 'Show complementary content') 
    : sidebarButton.setAttribute('aria-label', 'Hide complementary content');

    map.invalidateSize();
}
);

sidebarButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sidebarButton.click();
    }
});

//hide labels from screen readers
document.querySelectorAll('.label').forEach(label => label.setAttribute('aria-hidden', 'true'));

export {focusPopup};

// =====================
// Collapsible sections (Map Configuration, Symbols)
// =====================
function setupCollapsible(toggleId, contentId) {
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

    // Click on the button toggles (and do not bubble to header to avoid double toggle)
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

    // Click anywhere on the header row toggles (except when clicking the button itself)
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('#' + toggleId)) return; // ignore clicks on the button
            toggle();
        });
    }

    // Ensure initial state matches aria-expanded
    const initExpanded = btn.getAttribute('aria-expanded') === 'true';
    applyState(initExpanded);
}

setupCollapsible('map-config-toggle', 'map-config-content');
setupCollapsible('symbols-toggle', 'symbols');

// =====================
// AI Map Description
// =====================
const API_BASE = 'http://127.0.0.1:8000';
const aiButton = document.getElementById('ai-describe');
const aiSpeed = document.getElementById('ai-speed');
const aiOutput = document.getElementById('ai-description');
const aiDescriptionContainer = document.getElementById('ai-description-container');
let isAudioOn = true; // Audio ist immer aktiviert
let isSpeaking = false; // aktueller Wiedergabestatus
const transcriptCheckbox = document.getElementById('transcript-checkbox');

// Initialer Status in der Ausgabeleiste
if (aiOutput) {
    aiOutput.textContent = 'Audio-Transcript';
}

// Initialize transcript toggle state and wire change handler
if (transcriptCheckbox && aiDescriptionContainer) {
    // Sync checkbox with current visibility
    transcriptCheckbox.checked = !aiDescriptionContainer.classList.contains('hidden');
    transcriptCheckbox.addEventListener('change', () => {
        aiDescriptionContainer.classList.toggle('hidden', !transcriptCheckbox.checked);
    });
}

// Helfer: Button-Icon/Label aktualisieren
function updateAIButtonVisuals(speaking) {
    const btn = document.querySelector('.leaflet-control-ai .ai-main-btn');
    if (!btn) return;
    const icon = speaking ? 'speaker_mute_icon.png' : 'speaker_icon.png';
    btn.innerHTML = `<img src="./images/${icon}" alt="" aria-hidden="true" width="18" height="18">`;
    const label = speaking ? 'Stop Audiodescription' : 'Start Audiodescription';
    btn.title = label;
    btn.setAttribute('aria-label', label);
}

// Stop audio function (togglable)
function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        updateAIButtonVisuals(false);
        console.log('Audio stopped');
    }
}

async function captureMapAsDataUrl() {
    // Check if 3D mode is active - if so, capture from Mapbox GL canvas
    if (mapbox3DLayer && mapbox3DLayer._glMap) {
        try {
            console.log('3D mode detected, attempting to capture Mapbox GL canvas');
            const glMap = mapbox3DLayer._glMap;
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
    const canvas = await html2canvas(mapEl, { useCORS: true, backgroundColor: null, scale: 1 });
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Successfully captured with html2canvas, data URL length:', dataUrl.length);
    return dataUrl;
}

function getSpeed() {
    return aiSpeed ? (parseFloat(aiSpeed.value) || 1.0) : 1.0;
}

async function requestDescription(imageDataUrl) {
    const body = {
        data_url: imageDataUrl,
        speed: getSpeed(),
        voice: 'random',
        response_type: 'text',
        skip_openai: false
    };
    const res = await fetch(`${API_BASE}/description/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

function speak(text) {
    if (!('speechSynthesis' in window)) return;
    
    // Wait for voices to load, then speak
    const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = getSpeed();
        u.lang = 'en-US'; // Set language to English
        
        // Get all available voices
        const voices = speechSynthesis.getVoices();
        console.log('Alle verfügbaren Stimmen:', voices.length);
        
        // Filter English voices
        const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        console.log('Englische Stimmen gefunden:', enVoices.length);
        
        if (enVoices.length > 0) {
            // Chrome-optimized: Prefer Google voices with specific priority
            // 1. Google US English (natural sounding)
            let selectedVoice = enVoices.find(v => v.name.includes('Google US English'));
            
            // 2. Any Google UK English
            if (!selectedVoice) {
                selectedVoice = enVoices.find(v => v.name.includes('Google UK English'));
            }
            
            // 3. Any other Google voice
            if (!selectedVoice) {
                selectedVoice = enVoices.find(v => v.name.toLowerCase().includes('google'));
            }
            
            // 4. Fallback: First available English voice
            if (!selectedVoice) {
                selectedVoice = enVoices[0];
            }
            
            u.voice = selectedVoice;
            console.log('Verwende Stimme:', selectedVoice.name, '(' + selectedVoice.lang + ')');
        } else {
            console.warn('Keine englischen Stimmen gefunden! Verwende Standard-Stimme.');
        }
        
        console.log('Geschwindigkeit:', u.rate);
        
        // Begin speaking
        window.speechSynthesis.cancel();
        isSpeaking = true;
        updateAIButtonVisuals(true);
        // Reset visuals when done or error
        u.onend = () => { isSpeaking = false; updateAIButtonVisuals(false); };
        u.onerror = () => { isSpeaking = false; updateAIButtonVisuals(false); };
        window.speechSynthesis.speak(u);
    };
    
    // Chrome needs time to load voices
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
        // Wait for voices to load
        speechSynthesis.onvoiceschanged = () => {
            doSpeak();
        };
    } else {
        doSpeak();
    }
}

async function describeCurrentMap(startBtn) {
    const btn = startBtn || aiButton;
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Beschreibe…';
    }
    aiOutput.textContent = 'Loading Audio-Transcript...';
    try {
        const dataUrl = await captureMapAsDataUrl();
        const result = await requestDescription(dataUrl);
        const text = result?.text_data?.message || 'Keine Beschreibung verfügbar.';
        aiOutput.textContent = text;
        if (isAudioOn) speak(text);
    } catch (err) {
        aiOutput.textContent = `Fehler: ${err.message}`;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Beschreibung abrufen';
        }
    }
}

// Sidebar button wiring (falls vorhanden)
aiButton?.addEventListener('click', () => {
    if (isSpeaking) {
        stopAudio();
    } else {
        describeCurrentMap(aiButton);
    }
});

// Leaflet AI control (hover to expand)
const AIDescribeControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-ai');

        // Prevent map interactions when using control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

    const mainBtn = L.DomUtil.create('a', 'ai-main-btn', container);
        mainBtn.href = '#';
    mainBtn.title = 'Describe Map with Audio';
    mainBtn.setAttribute('aria-label', 'Describe Map with Audio');
    mainBtn.innerHTML = '<img src="./images/speaker_icon.png" alt="" aria-hidden="true" width="18" height="18">';

    const panel = L.DomUtil.create('div', 'ai-panel', container);

        // Eine Zeile: Toggle links, Button rechts
        const row = L.DomUtil.create('div', 'ai-row', panel);

        // Audio toggle (reusing switch style)
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

        // Events: Nur verhindern, dass der Link scrollt; Anzeige rein via CSS :hover
        mainBtn.addEventListener('click', (e) => { e.preventDefault(); });
        startBtn.addEventListener('click', async () => { await describeCurrentMap(startBtn); });
        checkbox.addEventListener('change', (e) => {
            isAudioOn = !!e.target.checked;
        });

        return container;
    }
});

// Add control to map
map.addControl(new AIDescribeControl({ position: 'topleft' }));

// Reorder controls: place the speaker button above the layers control
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

// Update AI button functionality
const aiMainButton = document.querySelector('.leaflet-control-ai .ai-main-btn');
// Toggle: Start/Stop per Klick
aiMainButton.addEventListener('click', () => {
    if (isSpeaking) {
        stopAudio();
    } else {
        describeCurrentMap();
    }
});

// Initiale Visuals setzen
updateAIButtonVisuals(false);

// Preload voices for Chrome
if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {
        const voices = speechSynthesis.getVoices();
        const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        console.log('Stimmen geladen:', voices.length, 'gesamt, davon', enVoices.length, 'englisch');
        const googleVoices = enVoices.filter(v => v.name.toLowerCase().includes('google'));
        if (googleVoices.length > 0) {
            console.log('Verfügbare Google-Stimmen:', googleVoices.map(v => v.name));
        }
    };
}

    // ===== Compass Control =====
    const compass = document.getElementById('compass');
    const compassArrow = document.getElementById('compass-arrow');
    let compassUpdateInterval = null;

    function showCompass() {
        if (compass) {
            compass.classList.add('visible');
            startCompassTracking();
        }
    }

    function hideCompass() {
        if (compass) {
            compass.classList.remove('visible');
            stopCompassTracking();
            // Reset arrow rotation
            if (compassArrow) {
                compassArrow.style.transform = 'rotate(0deg)';
            }
        }
    }

    function startCompassTracking() {
        // Update compass every 100ms while in 3D mode
        compassUpdateInterval = setInterval(() => {
            if (mapbox3DLayer && mapbox3DLayer._glMap) {
                const bearing = mapbox3DLayer._glMap.getBearing();
                updateCompassRotation(bearing);
            }
        }, 100);
    }

    function stopCompassTracking() {
        if (compassUpdateInterval) {
            clearInterval(compassUpdateInterval);
            compassUpdateInterval = null;
        }
    }

    function updateCompassRotation(bearing) {
        if (compassArrow) {
            // Rotate arrow opposite to map bearing so it always points north
            compassArrow.style.transform = `rotate(${-bearing}deg)`;
        }
    }

    function resetMapRotation() {
        if (mapbox3DLayer && mapbox3DLayer._glMap) {
            const mapboxMap = mapbox3DLayer._glMap;
            // Smoothly rotate back to north
            mapboxMap.easeTo({
                bearing: 0,
                pitch: 60,
                duration: 800
            });
            console.log('Map rotation reset to North');
        }
    }

    // Compass click handler - reset rotation
    if (compass) {
        compass.addEventListener('click', resetMapRotation);
        compass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                resetMapRotation();
            }
        });
    }
