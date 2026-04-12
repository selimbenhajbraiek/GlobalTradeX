import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field


def _enum_to_str(v):
    if isinstance(v, enum.Enum):
        return v.value
    return v


StrEnumField = Annotated[str, BeforeValidator(_enum_to_str)]


class ProductShipmentLink(BaseModel):
    product_id: int = Field(..., ge=1)
    quantity: int = Field(..., ge=1)


class ShipmentCreate(BaseModel):
    """Reference is generated server-side (GTX-YYYYMMDD-#####)."""

    origin: str = Field(default="", max_length=200)
    destination: str = Field(default="", max_length=200)
    cargo_type: str = "general"
    transport_mode: str = "sea"
    status: str = "pending"
    weight_kg: Decimal | None = None
    volume_m3: Decimal | None = None
    estimated_value: Decimal | None = None
    currency: str = Field(default="USD", max_length=10)
    freight_estimate_usd: Decimal | None = None
    departure_date: date | None = None
    arrival_date: date | None = None
    notes: str | None = None
    product_items: list[ProductShipmentLink] = Field(default_factory=list)


class ShipmentStatusUpdateBody(BaseModel):
    """Payload for PATCH /shipments/{id}/status (freight forwarder / admin)."""

    new_status: str
    notes: str | None = None
    vessel_name: str | None = Field(None, max_length=200)
    voyage_number: str | None = Field(None, max_length=100)
    eta_update: date | None = None


class ShipmentUpdate(BaseModel):
    reference: str | None = Field(None, max_length=50)
    origin: str | None = Field(None, max_length=200)
    destination: str | None = Field(None, max_length=200)
    cargo_type: str | None = None
    transport_mode: str | None = None
    status: str | None = None
    weight_kg: Decimal | None = None
    volume_m3: Decimal | None = None
    estimated_value: Decimal | None = None
    currency: str | None = Field(None, max_length=10)
    freight_estimate_usd: Decimal | None = None
    departure_date: date | None = None
    arrival_date: date | None = None
    vessel_name: str | None = Field(None, max_length=200)
    voyage_number: str | None = Field(None, max_length=100)
    eta_update: date | None = None
    notes: str | None = None


class ShipmentResponse(BaseModel):
    id: int
    owner_id: int
    reference: str
    origin: str
    destination: str
    cargo_type: StrEnumField
    transport_mode: StrEnumField
    status: StrEnumField
    weight_kg: Decimal | None
    volume_m3: Decimal | None
    estimated_value: Decimal | None
    currency: str
    freight_estimate_usd: Decimal | None
    departure_date: date | None
    arrival_date: date | None
    vessel_name: str | None = None
    voyage_number: str | None = None
    eta_update: date | None = None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShipmentOwnerBrief(BaseModel):
    full_name: str
    email: str


class ShipmentDocumentBrief(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: StrEnumField
    is_verified: bool
    ai_result: dict | None

    model_config = {"from_attributes": True}


class ShipmentNotificationBrief(BaseModel):
    id: int
    title: str
    message: str
    notification_type: StrEnumField
    created_at: datetime
    is_read: bool

    model_config = {"from_attributes": True}


class ShipmentDetailResponse(ShipmentResponse):
    documents: list[ShipmentDocumentBrief]
    owner: ShipmentOwnerBrief
    notifications: list[ShipmentNotificationBrief]
