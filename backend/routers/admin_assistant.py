from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from assistant.analytics import build_assistant_metrics
from assistant.config_store import get_assistant_config
from auth.dependencies import require_role
from avatar.services.heygen_service import get_heygen_service
from database import get_db
from models.assistant_config import AssistantConfig
from models.user import User

router = APIRouter()
_admin_only = Depends(require_role(["admin"]))


class AssistantSettingsOut(BaseModel):
    heygen_avatar_id: str
    heygen_voice_id: str
    greeting_message: str
    is_enabled: bool
    heygen_configured: bool


class AssistantSettingsUpdate(BaseModel):
    heygen_avatar_id: str | None = None
    heygen_voice_id: str | None = None
    greeting_message: str | None = None
    is_enabled: bool | None = None


class AssistantTestRequest(BaseModel):
    message: str = Field(default="How do I track a shipment?", min_length=1)


class AssistantTestResponse(BaseModel):
    text: str
    video_url: str | None = None
    error: str | None = None
    generation_ms: int | None = None


@router.get("/settings", response_model=AssistantSettingsOut)
def get_settings(_: User = _admin_only) -> AssistantSettingsOut:
    runtime = get_assistant_config()
    return AssistantSettingsOut(
        heygen_avatar_id=runtime.heygen_avatar_id,
        heygen_voice_id=runtime.heygen_voice_id,
        greeting_message=runtime.greeting_message,
        is_enabled=runtime.is_enabled,
        heygen_configured=get_heygen_service().enabled,
    )


@router.patch("/settings", response_model=AssistantSettingsOut)
def update_settings(
    payload: AssistantSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> AssistantSettingsOut:
    row = db.get(AssistantConfig, 1)
    if row is None:
        runtime = get_assistant_config()
        row = AssistantConfig(
            id=1,
            heygen_avatar_id=runtime.heygen_avatar_id,
            heygen_voice_id=runtime.heygen_voice_id,
            greeting_message=runtime.greeting_message,
            is_enabled=runtime.is_enabled,
        )
        db.add(row)
    if payload.heygen_avatar_id is not None:
        row.heygen_avatar_id = payload.heygen_avatar_id.strip()
    if payload.heygen_voice_id is not None:
        row.heygen_voice_id = payload.heygen_voice_id.strip()
    if payload.greeting_message is not None:
        row.greeting_message = payload.greeting_message.strip()
    if payload.is_enabled is not None:
        row.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(row)
    return AssistantSettingsOut(
        heygen_avatar_id=row.heygen_avatar_id,
        heygen_voice_id=row.heygen_voice_id,
        greeting_message=row.greeting_message,
        is_enabled=row.is_enabled,
        heygen_configured=get_heygen_service().enabled,
    )


@router.post("/test", response_model=AssistantTestResponse)
async def test_assistant(payload: AssistantTestRequest, _: User = _admin_only) -> AssistantTestResponse:
    heygen = get_heygen_service()
    if not heygen.enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HeyGen is not configured")
    from assistant.service import AssistantService
    from assistant.sessions import AssistantSession

    session = AssistantSession(id="admin-test", user_id=0, user_role="admin")
    reply = AssistantService().generate_reply(session, payload.message).get("text") or payload.message
    result = await heygen.create_talk_video(reply)
    return AssistantTestResponse(
        text=reply,
        video_url=result.get("video_url"),
        error=result.get("error"),
        generation_ms=result.get("generation_ms"),
    )


@router.get("/analytics")
def assistant_analytics(db: Session = Depends(get_db), _: User = _admin_only) -> dict:
    return build_assistant_metrics(db)


@router.get("/voices")
async def list_voices(_: User = _admin_only) -> dict:
    service = get_heygen_service()
    if not service.enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HeyGen is not configured")
    voices = await service._provider.list_voices()
    return {
        "voices": [
            {
                "voice_id": voice.get("voice_id"),
                "name": voice.get("name"),
                "language": voice.get("language"),
                "gender": voice.get("gender"),
            }
            for voice in voices
            if isinstance(voice, dict) and voice.get("voice_id")
        ]
    }


@router.get("/avatars")
async def list_avatars(_: User = _admin_only) -> dict:
    service = get_heygen_service()
    if not service.enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HeyGen is not configured")
    avatars = await service._provider.list_avatars()
    return {
        "avatars": [
            {
                "avatar_id": avatar.get("avatar_id"),
                "avatar_name": avatar.get("avatar_name"),
                "gender": avatar.get("gender"),
                "default_voice_id": avatar.get("default_voice_id"),
            }
            for avatar in avatars
            if isinstance(avatar, dict) and avatar.get("avatar_id")
        ]
    }
