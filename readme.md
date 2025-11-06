# Accessible Map – mit lokaler KI-Beschreibung (Ollama)

Dieses Repository enthält eine barrierefreundliche Webkarte (Leaflet) und eine kleine FastAPI-Backend-API, die einen Screenshot der Karte an ein lokal laufendes Vision‑Language‑Modell (Ollama) sendet. Damit erzeugt der Button „Beschreibung abrufen“ eine kurze, verständliche Textbeschreibung der aktuell sichtbaren Karte und kann sie optional per Browser‑Sprachausgabe vorlesen.

## TODO

- Simplified Map überarbeiten
- 

## Inhalt

- Frontend: `index.html`, `script.js`, `style.css`, Daten und Plugins
- Mapbox Key eintragen
- Backend (lokal): `map-to-speech-demo/api/`
- Beispiel‑GeoJSON‑Daten: `data/austriancastles.geojson`

## Voraussetzungen

- Windows/macOS/Linux
- Python 3.10+ (für das Backend)
- [Ollama](https://ollama.com/) installiert und gestartet (Standard: `http://127.0.0.1:11434`)
- Ein Qwen‑VL‑Modell lokal vorhanden (empfohlen: `qwen3-vl:4b`)

## Projekt starten

### Schnellstart (Windows, cmd)

Einmalige Einrichtung und Start in zwei Terminals:

```cmd

Ollama‑Modell laden:
ollama pull qwen3-vl:4b

Backend starten:
cd map-to-speech-demo\api
python -m venv .venv
.venv\Scripts\activate
(pip install -r requirements.txt)
set OLLAMA_MODEL=qwen3-vl:4b
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

```

### Backend (FastAPI) starten

```cmd
cd map-to-speech-demo\api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set OLLAMA_MODEL=qwen3-vl:4b
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Optionale Umgebungsvariablen (Windows cmd):

```cmd
set ALLOW_ORIGINS=*
set OLLAMA_HOST=http://127.0.0.1:11434
set OLLAMA_MODEL=qwen3-vl:4b
```

## API (lokal)

- Basis‑URL: `http://127.0.0.1:8000`
- Endpoint: `POST /description/`
- Content‑Type: `application/json`

Request‑Body:

```json
{
  "data_url": "data:image/png;base64,....",
  "speed": 1.0,
  "voice": "random",
  "response_type": "text",
  "skip_openai": false
}
```

Antwort:

```json
{
  "text_data": { "message": "Kurzbeschreibung der sichtbaren Karte" },
  "audio_data": null
}
```

Test mit `curl` (Windows cmd – JSON mit `\"` quoten):

```cmd
curl -X POST "http://127.0.0.1:8000/description/" ^
  -H "Content-Type: application/json" ^
  -d "{\"data_url\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAgMBgFQ3xjQAAAAASUVORK5CYII=\",\"speed\":1.0,\"voice\":\"random\",\"response_type\":\"text\",\"skip_openai\":false}"
```

Hinweise:
- `data_url` ist normalerweise ein größerer PNG‑Screenshot der Karte, den das Frontend über `html2canvas` erzeugt. Obige `1x1`‑PNG dient nur als Minimaltest.
- Das Backend versucht zuerst `/api/generate` und fällt automatisch auf `/api/chat` zurück, falls nötig.

## Fehlerbehebung

```cmd
curl http://127.0.0.1:11434/api/tags
```

## Lizenz / Ursprünge

- Das Demo‑Backend basiert auf einer adaptierten Variante des „map‑to‑speech“ Ansatzes; OpenAI wurde durch ein lokales Ollama‑VLM ersetzt.
- Frontend ist Leaflet‑basiert mit zusätzlichen Plugins. Siehe Ordner `plugins/` und enthaltene Lizenzen.
