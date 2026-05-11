from __future__ import annotations

from sqlalchemy.orm import Session

from avatar.repository import get_active_avatar
from config import get_settings
from models.assistant_avatar import AssistantAvatar


def resolve_presenter_source(db: Session | None = None) -> tuple[str | None, str | None, AssistantAvatar | None]:
    """Return presenter source URL, voice id, and active avatar record."""
    settings = get_settings()
    env_presenter = (settings.did_presenter_url or "").strip()
    env_voice = (settings.elevenlabs_voice_id or "").strip() or None

    if db is None:
        return env_presenter or None, env_voice, None

    avatar = get_active_avatar(db)
    if avatar is None:
        return env_presenter or None, env_voice, None

    presenter = (avatar.presenter_source_url or "").strip() or env_presenter or None
    voice = (avatar.voice_id or "").strip() or env_voice
    return presenter, voice, avatar
