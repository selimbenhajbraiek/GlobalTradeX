from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class AssistantConfig(Base):
    __tablename__ = "assistant_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    heygen_avatar_id: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    heygen_voice_id: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    greeting_message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
