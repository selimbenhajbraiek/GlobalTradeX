from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


def synthesize_speech(text: str, *, voice_id: str | None = None) -> dict[str, Any]:
    """Return base64 MP3 audio using ElevenLabs when configured (Gemini has no TTS API)."""
    content = (text or "").strip()
    if not content:
        return {"audio_base64": "", "error": "Text is required"}

    settings = get_settings()
    eleven_key = (settings.elevenlabs_api_key or "").strip()
    voice = (voice_id or settings.elevenlabs_voice_id or "").strip()

    if eleven_key and voice:
        try:
            with httpx.Client(timeout=45.0) as client:
                response = client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                    headers={
                        "xi-api-key": eleven_key,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    json={
                        "text": content[:2500],
                        "model_id": "eleven_multilingual_v2",
                    },
                )
                response.raise_for_status()
                encoded = base64.standard_b64encode(response.content).decode("ascii")
                return {"audio_base64": encoded, "mime_type": "audio/mpeg", "provider": "elevenlabs"}
        except Exception as exc:
            logger.exception("ElevenLabs TTS failed: %s", exc)

    return {
        "audio_base64": "",
        "error": "No TTS provider configured (set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID)",
    }
