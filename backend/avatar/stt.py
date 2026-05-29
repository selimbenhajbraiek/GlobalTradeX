from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from config import get_settings
from services.llm_client import default_llm_model, llm_api_key

logger = logging.getLogger(__name__)


def transcribe_audio(data: bytes, *, filename: str = "audio.webm", mime: str = "audio/webm") -> dict[str, Any]:
    """Transcribe user speech with Gemini (multimodal generateContent)."""
    settings = get_settings()
    key = llm_api_key(settings)
    if not key:
        return {"text": "", "error": "GOOGLE_API_KEY not configured"}
    if not data:
        return {"text": "", "error": "Empty audio payload"}

    model = default_llm_model(settings)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Transcribe the spoken audio exactly. "
                            "Return only the transcription text, no labels or commentary."
                        )
                    },
                    {"inline_data": {"mime_type": mime, "data": base64.standard_b64encode(data).decode("ascii")}},
                ]
            }
        ]
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, params={"key": key}, json=payload)
            response.raise_for_status()
            body = response.json()
        parts = (
            body.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
        return {"text": text, "provider": "gemini"}
    except Exception as exc:
        logger.exception("Gemini transcription failed: %s", exc)
        return {"text": "", "error": str(exc)}
