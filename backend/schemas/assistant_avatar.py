from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from models.assistant_avatar import AssistantAvatarStatus


class AssistantAvatarPersona(BaseModel):
    tone: str = "friendly"
    style: str = "concise"
    expertise: str = "platform expert"


class AssistantAvatarOut(BaseModel):
    id: int
    admin_id: int
    original_filename: str
    video_size: int
    status: AssistantAvatarStatus
    presenter_source_url: str | None = None
    avatar_provider_id: str | None = None
    voice_id: str | None = None
    persona: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None
    is_active: bool = False
    preview_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AssistantAvailabilityOut(BaseModel):
    available: bool
    status: AssistantAvatarStatus | str = AssistantAvatarStatus.not_created
    message: str = ""
    preview_url: str | None = None
