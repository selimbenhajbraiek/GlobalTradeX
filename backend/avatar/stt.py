from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

from config import get_settings

logger = logging.getLogger(__name__)


def transcribe_audio(data: bytes, *, filename: str = "audio.webm", mime: str = "audio/webm") -> dict[str, Any]:
    """Transcribe user speech with OpenAI Whisper."""
    settings = get_settings()
    if not settings.openai_api_key:
        return {"text": "", "error": "OPENAI_API_KEY not configured"}
    if not data:
        return {"text": "", "error": "Empty audio payload"}

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        buffer = BytesIO(data)
        buffer.name = filename
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer,
            response_format="json",
        )
        text = (getattr(result, "text", None) or "").strip()
        return {"text": text, "language": getattr(result, "language", None)}
    except Exception as exc:
        logger.exception("Whisper transcription failed: %s", exc)
        return {"text": "", "error": str(exc)}
