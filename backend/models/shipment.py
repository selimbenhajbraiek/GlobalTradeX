from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class CargoType(str, enum.Enum):
    general = "general"
    fragile = "fragile"
    dangerous = "dangerous"
    perishable = "perishable"
    oversized = "oversized"


class TransportMode(str, enum.Enum):
    air = "air"
    sea = "sea"
    road = "road"
    rail = "rail"


class ShipmentStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    customs_hold = "customs_hold"
    delivered = "delivered"
    delayed = "delayed"
    cancelled = "cancelled"


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    origin: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    destination: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    cargo_type: Mapped[CargoType] = mapped_column(
        Enum(CargoType, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=CargoType.general,
    )
    transport_mode: Mapped[TransportMode] = mapped_column(
        Enum(TransportMode, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=TransportMode.sea,
    )
    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=ShipmentStatus.pending,
    )
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    volume_m3: Mapped[Decimal | None] = mapped_column(Numeric(10, 3), nullable=True)
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    departure_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    arrival_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="shipments")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="shipment",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="shipment",
        foreign_keys="Notification.shipment_id",
    )
