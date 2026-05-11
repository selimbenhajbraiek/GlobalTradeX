from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class AssistantAvatarStatus(str, enum.Enum):
    not_created = "not_created"
    processing = "processing"
    ready = "ready"
    error = "error"


class AssistantAvatar(Base):
    __tablename__ = "assistant_avatars"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    video_path: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    video_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    public_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    presenter_source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    avatar_provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    voice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[AssistantAvatarStatus] = mapped_column(
        Enum(AssistantAvatarStatus, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=AssistantAvatarStatus.not_created,
    )
    persona: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    admin = relationship("User", back_populates="assistant_avatars")
