from __future__ import annotations

from dataclasses import dataclass

from config import get_settings
from database import SessionLocal
from models.assistant_config import AssistantConfig


@dataclass
class AssistantRuntimeConfig:
    heygen_avatar_id: str
    heygen_voice_id: str
    greeting_message: str
    is_enabled: bool


def get_assistant_config() -> AssistantRuntimeConfig:
    settings = get_settings()
    defaults = AssistantRuntimeConfig(
        heygen_avatar_id=settings.heygen_avatar_id,
        heygen_voice_id=settings.heygen_voice_id,
        greeting_message=settings.assistant_greeting_message,
        is_enabled=settings.assistant_enabled,
    )
    db = SessionLocal()
    try:
        row = db.get(AssistantConfig, 1)
        if row is None:
            return defaults
        return AssistantRuntimeConfig(
            heygen_avatar_id=row.heygen_avatar_id or defaults.heygen_avatar_id,
            heygen_voice_id=row.heygen_voice_id or defaults.heygen_voice_id,
            greeting_message=row.greeting_message or defaults.greeting_message,
            is_enabled=row.is_enabled if row.is_enabled is not None else defaults.is_enabled,
        )
    finally:
        db.close()
