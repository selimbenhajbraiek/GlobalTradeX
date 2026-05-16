from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)


class ThreadCreate(BaseModel):
    recipient_user_id: int
    body: str = Field(..., min_length=1, max_length=8000)
    shipment_id: int | None = None
    subject: str | None = Field(None, max_length=500)


class ParticipantOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    thread_id: int
    sender_id: int
    body: str
    created_at: datetime
    sender_name: str | None = None
    is_mine: bool = False

    model_config = {"from_attributes": True}


class ThreadOut(BaseModel):
    id: int
    shipment_id: int | None
    subject: str | None
    shipment_reference: str | None = None
    updated_at: datetime
    unread_count: int = 0
    last_message: str | None = None
    last_message_at: datetime | None = None
    participants: list[ParticipantOut] = []

    model_config = {"from_attributes": True}


class ThreadDetailOut(ThreadOut):
    messages: list[MessageOut] = []
