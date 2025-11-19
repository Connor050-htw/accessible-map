%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#ffffff','noteFontSize':'16px','primaryTextColor':'#000000','primaryBorderColor':'#333333','lineColor':'#666666','secondaryColor':'#f0f0f0','tertiaryColor':'#e0e0e0','background':'#ffffff','mainBkg':'#ffffff','secondBkg':'#f5f5f5'}}}%%

sequenceDiagram
    autonumber
    
    participant TTS as Web Speech API<br>(Browser)
    participant App as Webkarte<br>(Frontend)
    participant API as FastAPI<br>(Backend)
    participant OllamaQwen as Ollama + Qwen2-VL<br>(Vision Model)
    
    rect rgb(245, 245, 245)
        Note over App: "Start Audiodescription"
        App->>App: Screenshot erstellen (html2canvas)
        App->>App: Konvertiere zu Base64 PNG
    end
    
    rect rgb(245, 245, 245)
        Note over App,API: HTTP POST Request
        App->>+API: Base64 Image +<br>Sprache
    end
    
    rect rgb(245, 245, 245)
        Note over API,OllamaQwen: Vision Request
        API->>+OllamaQwen: Prompt +<br>Base64 Image +<br>Sprache
        OllamaQwen->>OllamaQwen: Bildanalyse
        OllamaQwen-->>-API: Textbeschreibung
    end
    
    rect rgb(245, 245, 245)
        Note over API,App: HTTP Response
        API-->>-App: Textbeschreibung
    end
    
    rect rgb(245, 245, 245)
        Note over App,TTS: Sprachausgabe
        App->>+TTS: Textbeschreibung
        TTS->>TTS: Text-to-Speech<br>(Browser-Engine)
        TTS-->>-App: Audio-Wiedergabe
    end
    
    rect rgb(245, 245, 245)
        Note over App: Audiowiedergabe
    end
