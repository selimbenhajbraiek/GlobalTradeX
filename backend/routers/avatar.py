from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from assistant.service import AssistantService
from assistant.sessions import get_session_manager
from auth.dependencies import get_current_user
from assistant.config_store import get_assistant_config
from avatar.presenter import resolve_presenter_source
from avatar.repository import get_active_avatar, get_avatar_by_token
from avatar.services.heygen_service import get_heygen_service
from avatar.stt import transcribe_audio
from avatar.talk_pipeline import generate_avatar_media
from avatar.tts import synthesize_speech
from database import get_db
from models.assistant_avatar import AssistantAvatarStatus
from models.user import User
from schemas.assistant_avatar import AssistantAvailabilityOut

router = APIRouter()
BACKEND_ROOT = Path(__file__).resolve().parent.parent


class AvatarTalkRequest(BaseModel):
    message: str = Field(..., min_length=1)
    user_role: str = ""
    recent_shipments: list[Any] = Field(default_factory=list)
    session_id: str | None = None


class AvatarTalkResponse(BaseModel):
    text_response: str
    video_url: str | None = None
    audio_base64: str | None = None
    mime_type: str | None = None
    error: str | None = None


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice_id: str | None = None


class TranscribeResponse(BaseModel):
    text: str
    language: str | None = None
    error: str | None = None


@router.get("/status", response_model=AssistantAvailabilityOut)
def avatar_status(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> AssistantAvailabilityOut:
    runtime = get_assistant_config()
    if not runtime.is_enabled:
        return AssistantAvailabilityOut(
            available=False,
            status=AssistantAvatarStatus.not_created,
            message="Assistant temporarily unavailable",
        )
    if get_heygen_service().enabled:
        return AssistantAvailabilityOut(
            available=True,
            status=AssistantAvatarStatus.ready,
            message="Assistant is ready",
        )
    avatar = get_active_avatar(db)
    if avatar is None:
        return AssistantAvailabilityOut(
            available=False,
            status=AssistantAvatarStatus.not_created,
            message="Assistant temporarily unavailable",
        )
    if avatar.status != AssistantAvatarStatus.ready:
        return AssistantAvailabilityOut(
            available=False,
            status=avatar.status,
            message="Assistant avatar is still processing",
        )
    return AssistantAvailabilityOut(
        available=True,
        status=avatar.status,
        message="Assistant is ready",
        preview_url=f"/api/admin/avatars/{avatar.id}/preview",
    )


@router.get("/profile")
async def avatar_profile(_: User = Depends(get_current_user)) -> dict[str, Any]:
    service = get_heygen_service()
    profile = await service.get_avatar_profile()
    profile["available"] = service.enabled
    return profile


@router.get("/presenters/{public_token}/source")
def presenter_source(public_token: str, db: Session = Depends(get_db)) -> FileResponse:
    avatar = get_avatar_by_token(db, public_token)
    if avatar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presenter not found")
    abs_path = BACKEND_ROOT / avatar.video_path
    if not abs_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presenter video not found")
    media_type = "video/mp4" if abs_path.suffix.lower() == ".mp4" else "video/webm"
    return FileResponse(abs_path, media_type=media_type, filename=avatar.original_filename)


@router.post("/talk", response_model=AvatarTalkResponse)
async def avatar_talk(
    payload: AvatarTalkRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AvatarTalkResponse:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    manager = get_session_manager()
    session = None
    if payload.session_id:
        session = await manager.get_session(payload.session_id, user_id=user.id)
    if session is None:
        session = await manager.create_session(
            user_id=user.id,
            user_role=payload.user_role or role,
            recent_shipments=payload.recent_shipments,
        )

    _, _, active_avatar = resolve_presenter_source(db)
    persona = active_avatar.persona if active_avatar else None
    service = AssistantService()
    result = service.generate_reply(session, payload.message, persona=persona)
    text = (result.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Assistant returned no text")

    media = await generate_avatar_media(db, text)
    await manager.add_exchange(session.id, user_text=payload.message, assistant_text=text)
    return AvatarTalkResponse(
        text_response=text,
        video_url=media.get("video_url"),
        audio_base64=media.get("audio_base64"),
        mime_type=media.get("mime_type"),
        error=media.get("error"),
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def avatar_transcribe(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> TranscribeResponse:
    data = await file.read()
    result = transcribe_audio(data, filename=file.filename or "audio.webm", mime=file.content_type or "audio/webm")
    return TranscribeResponse(
        text=result.get("text") or "",
        language=result.get("language"),
        error=result.get("error"),
    )


@router.post("/speak")
def avatar_speak(payload: SpeakRequest, _: User = Depends(get_current_user)) -> Response:
    result = synthesize_speech(payload.text, voice_id=payload.voice_id)
    audio_b64 = result.get("audio_base64")
    if not audio_b64:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("error") or "Speech synthesis failed",
        )
    import base64

    audio = base64.standard_b64decode(audio_b64)
    return Response(content=audio, media_type=result.get("mime_type") or "audio/mpeg")
