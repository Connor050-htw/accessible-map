import base64
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel

# Configuration via environment with safe defaults
ALLOW_ORIGINS = os.environ.get("ALLOW_ORIGINS", "*")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3-vl:4b")

app = FastAPI()

_allow_any = ALLOW_ORIGINS.strip() == "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_any else ALLOW_ORIGINS.split(","),
    allow_credentials=False if _allow_any else True,
    allow_methods=["OPTIONS", "POST"],
    allow_headers=["*"],
)


class MapParams(BaseModel):
    data_url: str
    language: str = "en"  # 'en' or 'de'


@app.post("/description/")
async def post_description(request_params: MapParams):
    """
    Accepts a data URL of the current map view, sends it to a local Ollama
    vision-language model to get a concise textual description, and returns it.
    Audio synthesis is intentionally handled on the client using Web Speech API.
    """

    # Extract base64 image payload from data URL (e.g., 'data:image/png;base64,AAAA...')
    if "," in request_params.data_url:
        _, b64_data = request_params.data_url.split(",", 1)
    else:
        b64_data = request_params.data_url

    # Create language-specific prompt
    if request_params.language == "de":
        prompt = (
            "Beschreibe diese Karte in etwa 50 Wörtern für sehbehinderte Nutzer. "
            "Konzentriere dich auf: 1) Die geografische Region, "
            "2) Die Namen wichtiger Merkmale, "
            "3) Himmelsrichtungen (Norden, Süden, Osten, Westen) der wichtigsten Elemente. "
            "Sei klar und strukturiert. "
            "WICHTIG: Verwende KEINE Formatierungszeichen wie *, -, #, oder andere Sonderzeichen. "
            "Der Text wird direkt vorgelesen, also schreibe nur normalen Fließtext ohne Markdown oder Formatierung."
        )
    else:
        prompt = (
            "Describe this map in approximately 50 words for visually impaired users. "
            "Focus on: 1) The geographic region, "
            "2) The names of key features, "
            "3) Cardinal directions (north, south, east, west) of key elements. "
            "Be clear and structured. "
            "IMPORTANT: Do NOT use any formatting characters like *, -, #, or other special symbols. "
            "The text will be read aloud directly, so write only plain flowing text without Markdown or formatting."
        )

    # Prepare request for Ollama; try /api/generate, fallback to /api/chat
    base = OLLAMA_HOST.rstrip("/")
    text_message = None
    error_detail = None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            model_to_use = OLLAMA_MODEL

            async def try_chat(model_name: str):
                chat_payload = {
                    "model": model_name,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt,
                            "images": [b64_data],
                        }
                    ],
                    "stream": False,
                }
                rc = await client.post(f"{base}/api/chat", json=chat_payload)
                rc.raise_for_status()
                cd = rc.json()
                msg = cd.get("message", {})
                return msg.get("content", "")

            # First attempt: /api/generate
            gen_payload = {
                "model": model_to_use,
                "prompt": prompt,
                "images": [b64_data],
                "stream": False,
            }
            r = await client.post(f"{base}/api/generate", json=gen_payload)
            if r.status_code in (404, 405):
                # Fallback to chat
                try:
                    text_message = await try_chat(model_to_use)
                except httpx.HTTPStatusError as he:
                    # If model missing, auto-detect available qwen-vl model
                    if he.response.status_code == 404 and "model" in he.response.text and "not found" in he.response.text.lower():
                        tags = await client.get(f"{base}/api/tags")
                        tags.raise_for_status()
                        models = tags.json().get("models", [])
                        # pick first qwen + vl model, prefer qwen3
                        candidates = [
                            m["name"] for m in models
                            if isinstance(m, dict) and (
                                ("qwen3" in m.get("model", "").lower() or "qwen3" in m.get("name", "").lower())
                                and ("vl" in m.get("model", "").lower() or "vl" in m.get("name", "").lower())
                            )
                        ]
                        if not candidates:
                            candidates = [
                                m["name"] for m in models
                                if isinstance(m, dict) and (
                                    ("qwen" in m.get("model", "").lower() or "qwen" in m.get("name", "").lower())
                                    and ("vl" in m.get("model", "").lower() or "vl" in m.get("name", "").lower())
                                )
                            ]
                        if candidates:
                            model_to_use = candidates[0]
                            text_message = await try_chat(model_to_use)
                        else:
                            raise
                    else:
                        raise
            else:
                r.raise_for_status()
                data = r.json()
                text_message = data.get("response", "")
    except httpx.HTTPStatusError as he:
        error_detail = f"HTTP {he.response.status_code}: {he.response.text[:200]}"
    except Exception as e:
        error_detail = str(e)

    if text_message is None:
        text_message = f"Ollama error: {error_detail or 'unknown error'}"

    response_content = {
        "text_data": {"message": text_message},
        "audio_data": None,  # audio is produced client-side
    }
    return JSONResponse(content=response_content)
