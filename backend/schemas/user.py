import enum
from datetime import datetime
from typing import Annotated

from typing import Any

from pydantic import BaseModel, BeforeValidator, EmailStr, Field

from schemas.preferences import NotificationPreferences


def _enum_to_str(v):
    if isinstance(v, enum.Enum):
        return v.value
    return v


StrEnumField = Annotated[str, BeforeValidator(_enum_to_str)]


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = Field(default="importateur")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: StrEnumField
    phone: str | None = None
    notification_preferences: NotificationPreferences | dict[str, Any] | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    notification_preferences: dict[str, Any] | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
