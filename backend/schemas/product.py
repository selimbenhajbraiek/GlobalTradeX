from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    hs_code: str = Field(..., min_length=6, max_length=10)
    description: str | None = None
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    quantity: int = Field(default=1, ge=0)
    unit: str = Field(default="pcs", max_length=32)
    origin_country: str = Field(default="", max_length=100)

    @field_validator("hs_code", mode="before")
    @classmethod
    def strip_hs_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    hs_code: str | None = Field(None, min_length=6, max_length=10)
    description: str | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=32)
    origin_country: str | None = Field(default=None, max_length=100)

    @field_validator("hs_code", mode="before")
    @classmethod
    def strip_hs_code_optional(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


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


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    limit: int
