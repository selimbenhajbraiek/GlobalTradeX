from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from assistant.config_store import get_assistant_config
from avatar.presenter import resolve_presenter_source
from avatar.services.heygen_service import get_heygen_service
from avatar.tts import synthesize_speech


async def generate_avatar_media(
    db: Session,
    text: str,
    *,
    include_avatar: bool = True,
    include_audio: bool = True,
) -> dict[str, Any]:
    runtime = get_assistant_config()
    if not runtime.is_enabled:
        return {
            "video_url": None,
            "audio_base64": None,
            "mime_type": None,
            "error": "Assistant is currently disabled",
            "provider": None,
            "generation_ms": None,
        }

    _, voice_id, _avatar = resolve_presenter_source(db)
    video_url = None
    audio_base64 = None
    mime_type = None
    errors: list[str] = []
    provider = None
    generation_ms = None

    if include_audio:
        speech = synthesize_speech(text, voice_id=voice_id)
        audio_base64 = speech.get("audio_base64") or None
        mime_type = speech.get("mime_type")
        if speech.get("error") and not audio_base64:
            errors.append(str(speech["error"]))

    if include_avatar:
        heygen = get_heygen_service()
        if heygen.enabled:
            talk = await heygen.create_talk_video(text)
            video_url = talk.get("video_url")
            provider = talk.get("provider")
            generation_ms = talk.get("generation_ms")
            if talk.get("error") and not video_url:
                errors.append(str(talk["error"]))
        else:
            errors.append("HeyGen avatar is not configured")

    return {
        "video_url": video_url,
        "audio_base64": audio_base64,
        "mime_type": mime_type,
        "error": "; ".join(errors) if errors else None,
        "provider": provider,
        "generation_ms": generation_ms,
    }
