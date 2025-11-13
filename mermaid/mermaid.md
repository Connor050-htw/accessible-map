%%{init: {
  "theme": "neutral",
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": false,
    "curve": "basis",
    "rankSpacing": 25,
    "nodeSpacing": 20,
    "padding": 8
  },
  "themeVariables": {
    "fontSize": "10px",
    "primaryColor": "#D6E8FF",
    "edgeLabelBackground":"#fff",
    "tertiaryColor": "#f2f2f2"
  }
}}%%
flowchart LR
    %% Client Tier
    subgraph "Client Tier (Browser)"
        direction LR
        A_html["index.html"]:::frontend
        A_data["data.js"]:::frontend
        A_geo["austriancastles.geojson"]:::frontend
        A_images["images/"]:::frontend

        subgraph "Core"
            direction TB
            A_map["map.js"]:::frontend
            A_config["config.js"]:::frontend
        end

        subgraph "Controls"
            direction TB
            A_ai["ai-description.js"]:::frontend
            A_compass["compass.js"]:::frontend
        end

        subgraph "Features"
            direction TB
            A_3d["3d-mode.js"]:::frontend
            A_lod["lod-control.js"]:::frontend
            A_settings["settings.js"]:::frontend
        end

        subgraph "Layers"
            direction TB
            A_3dbuild["3d-buildings.js"]:::frontend
            A_basemap["basemaps.js"]:::frontend
            A_poi["poi-markers.js"]:::frontend
        end

        subgraph "UI"
            direction TB
            A_sidebar["sidebar.js"]:::frontend
            A_access["accessibility.js"]:::frontend
            A_keys["shortcuts.js"]:::frontend
        end

        subgraph "Utils"
            direction TB
            A_dom["dom-helpers.js"]:::frontend
            A_capture["map-capture.js"]:::frontend
        end

        subgraph "Plugins"
            direction TB
            A_full["FullScreen Plugin"]:::frontend
            A_pin["PinSearch Plugin"]:::frontend
        end

        subgraph "Styles"
            direction TB
            A_baseCSS["base.css"]:::frontend
            A_mainCSS["main.css"]:::frontend
            A_compCSS["components/"]:::frontend
        end
    end

    %% Backend & External
    subgraph "Service Tier (FastAPI)"
        direction TB
        B_main["main.py (POST /description/)"]:::backend
        B_req["requirements.txt"]:::backend
    end

    subgraph "External Tier"
        direction TB
        C_ollama["Ollama VLM (qwen3-vl)"]:::external
        C_tiles["Tile Providers (Mapbox/OSM)"]:::external
    end

    %% Data Flows
    A_basemap -->|"Tile HTTP(S)"| C_tiles
    A_3dbuild -->|"Tile HTTP(S)"| C_tiles
    A_poi -->|"Tile HTTP(S)"| C_tiles
    A_ai -->|"POST /description/"| B_main
    B_main -->|"HTTP /api/generate/chat"| C_ollama
    C_ollama -->|"JSON (text/audio)"| B_main
    B_main -->|"JSON {text,audio}"| A_ai

    %% Styling
    classDef frontend fill:#D6E8FF,stroke:#333,stroke-width:1px
    classDef backend fill:#D2F8D2,stroke:#333,stroke-width:1px
    classDef external fill:#FFE4B5,stroke:#333,stroke-width:1px

    class A_html,A_data,A_geo,A_images,A_map,A_config,A_ai,A_compass,A_3d,A_lod,A_settings,A_3dbuild,A_basemap,A_poi,A_sidebar,A_access,A_keys,A_dom,A_capture,A_full,A_pin,A_baseCSS,A_mainCSS,A_compCSS frontend
    class B_main,B_req backend
    class C_ollama,C_tiles external
