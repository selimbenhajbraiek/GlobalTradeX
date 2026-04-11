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


class ShipmentCreate(BaseModel):
    reference: str = Field(..., max_length=50)
    origin: str = Field(default="", max_length=200)
    destination: str = Field(default="", max_length=200)
    cargo_type: str = "general"
    transport_mode: str = "sea"
    status: str = "pending"
    weight_kg: Decimal | None = None
    volume_m3: Decimal | None = None
    estimated_value: Decimal | None = None
    departure_date: date | None = None
    arrival_date: date | None = None
    notes: str | None = None


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
    departure_date: date | None = None
    arrival_date: date | None = None
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
    departure_date: date | None
    arrival_date: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
