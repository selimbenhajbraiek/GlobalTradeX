from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class TradeDocumentType(str, enum.Enum):
    """Exporter / trade classification for uploaded files."""

    commercial_invoice = "commercial_invoice"
    packing_list = "packing_list"
    certificate_of_origin = "certificate_of_origin"
    bill_of_lading = "bill_of_lading"
    customs_declaration = "customs_declaration"
    other = "other"


# Backwards compatibility for imports
DocumentFileType = TradeDocumentType


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    shipment_id: Mapped[int | None] = mapped_column(
        ForeignKey("shipments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[TradeDocumentType] = mapped_column(
        Enum(TradeDocumentType, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=TradeDocumentType.other,
    )
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    shipment: Mapped["Shipment | None"] = relationship(back_populates="documents")
    uploader: Mapped["User"] = relationship(
        back_populates="uploaded_documents",
        foreign_keys=[uploaded_by],
    )
