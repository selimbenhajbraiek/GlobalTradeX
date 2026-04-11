from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    hs_code: str = ""
    description: str | None = None
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    quantity: int = Field(default=1, ge=0)
    unit: str = Field(default="pcs", max_length=32)
    origin_country: str = Field(default="", max_length=100)


class ProductUpdate(BaseModel):
    name: str | None = None
    hs_code: str | None = None
    description: str | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=32)
    origin_country: str | None = Field(default=None, max_length=100)


class ProductResponse(BaseModel):
    id: int
    user_id: int
    name: str
    hs_code: str
    description: str | None
    unit_price: Decimal
    quantity: int
    unit: str
    origin_country: str
    created_at: datetime

    model_config = {"from_attributes": True}
