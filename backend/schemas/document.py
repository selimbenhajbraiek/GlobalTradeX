import enum
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator


def _enum_to_str(v):
    if isinstance(v, enum.Enum):
        return v.value
    return v


StrEnumField = Annotated[str, BeforeValidator(_enum_to_str)]


class DocumentCreate(BaseModel):
    shipment_id: int | None = None
    file_type: str = "other"


class DocumentResponse(BaseModel):
    id: int
    shipment_id: int | None
    uploaded_by: int
    filename: str
    original_name: str
    file_type: StrEnumField
    file_size: int
    file_path: str
    is_verified: bool
    ai_result: dict[str, Any] | None
    uploaded_at: datetime
    verified_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentBrokerRow(BaseModel):
    """Document row for broker dashboards with joined display fields."""

    id: int
    shipment_id: int | None
    uploaded_by: int
    filename: str
    original_name: str
    file_type: StrEnumField
    file_size: int
    file_path: str
    is_verified: bool
    ai_result: dict[str, Any] | None
    uploaded_at: datetime
    verified_at: datetime | None = None
    uploader_name: str | None = None
    shipment_reference: str | None = None

    model_config = {"from_attributes": True}


class DocumentVerifyBody(BaseModel):
    is_verified: bool
    rejection_reason: str | None = None
