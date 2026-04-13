from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    importateur = "importateur"
    exportateur = "exportateur"
    transitaire = "transitaire"
    courtier = "courtier"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=UserRole.importateur,
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shipments: Mapped[list["Shipment"]] = relationship(
        foreign_keys="Shipment.owner_id",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    export_shipments: Mapped[list["Shipment"]] = relationship(
        "Shipment",
        foreign_keys="Shipment.exporter_user_id",
        back_populates="exporter",
    )
    products: Mapped[list["Product"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    uploaded_documents: Mapped[list["Document"]] = relationship(
        back_populates="uploader",
        foreign_keys="Document.uploaded_by",
        cascade="all, delete-orphan",
    )
