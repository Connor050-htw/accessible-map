# Local AI backend (Ollama)

This FastAPI service powers the AI description button in the web app. It sends a screenshot of the map to a local vision-language model running in Ollama and returns a concise text description.

## Prerequisites

- Windows, macOS, or Linux
- [Ollama](https://ollama.com/) installed and running
- Model pulled locally (recommended):

```
ollama pull qwen3-vl:4b
```

## Install and run

Create a virtual environment (recommended), install deps, and start the server:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set OLLAMA_MODEL=qwen3-vl:4b
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Environment variables (optional):

- `ALLOW_ORIGINS`: Comma-separated list of allowed origins for CORS. Default: `*`.
- `OLLAMA_HOST`: Base URL for your Ollama server. Default: `http://127.0.0.1:11434`.
- `OLLAMA_MODEL`: Model name. Default: `qwen3-vl:4b`.

Note: If the configured model is not available locally, the server will query `/api/tags` and automatically retry with an installed Qwen-VL model (preferring Qwen3).

## API

POST /description/

Body:
- `data_url`: data URL (image/png) of the current map view
- `speed`, `voice`, `response_type`, `skip_openai`: accepted for compatibility; only `data_url` is used. Audio is synthesized in the browser via Web Speech API.

Response:
- `{ "text_data": { "message": "..." }, "audio_data": null }`

## Notes

- The frontend relies on html2canvas to render the Leaflet map into an image. This may require the tile servers to support CORS. The app sets `crossOrigin: true` for base layers, but if a provider blocks CORS the screenshot may degrade. Try switching base maps if needed.
