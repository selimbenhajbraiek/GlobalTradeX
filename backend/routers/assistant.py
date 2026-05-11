from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from assistant.config_store import get_assistant_config
from assistant.persistence import append_message, create_session_record, end_session_record, touch_session_record
from assistant.rate_limit import enforce_assistant_rate_limit
from assistant.service import AssistantService
from assistant.sessions import get_session_manager
from auth.dependencies import get_current_user
from auth.jwt import decode_token
from avatar.presenter import resolve_presenter_source
from avatar.talk_pipeline import generate_avatar_media
from avatar.tts import synthesize_speech
from database import SessionLocal, get_db
from models.user import User
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter()


class StartSessionRequest(BaseModel):
    user_role: str = ""
    recent_shipments: list[Any] = Field(default_factory=list)


class StartSessionResponse(BaseModel):
    session_id: str
    state: str = "idle"


class SessionMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)
    include_avatar: bool = True
    include_audio: bool = True


class AssistantReply(BaseModel):
    text: str
    state: str = "speaking"
    video_url: str | None = None
    audio_base64: str | None = None
    mime_type: str | None = None
    provider: str | None = None
    generation_ms: int | None = None
    error: str | None = None


async def _compose_reply(
    session_id: str,
    *,
    user_id: int,
    message: str,
    include_avatar: bool,
    include_audio: bool,
    db: Session,
) -> AssistantReply:
    manager = get_session_manager()
    session = await manager.get_session(session_id, user_id=user_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    enforce_assistant_rate_limit(user_id)
    await manager.touch(session_id)
    touch_session_record(db, session_id)
    _, _, active_avatar = resolve_presenter_source(db)
    persona = active_avatar.persona if active_avatar else None
    service = AssistantService()
    append_message(db, session_id=session_id, role="user", content=message)
    result = service.generate_reply(session, message, persona=persona)
    text = (result.get("text") or "").strip()
    if not text:
        text = (
            "I'm not sure, but I can guide you to the right section. "
            "Try Shipments or Documents from the sidebar."
        )

    media = await generate_avatar_media(
        db,
        text,
        include_avatar=include_avatar,
        include_audio=include_audio,
    )

    await manager.add_exchange(session_id, user_text=message, assistant_text=text)
    append_message(
        db,
        session_id=session_id,
        role="assistant",
        content=text,
        video_url=media.get("video_url"),
        provider=media.get("provider"),
        generation_ms=media.get("generation_ms"),
    )
    return AssistantReply(
        text=text,
        state="speaking",
        video_url=media.get("video_url"),
        audio_base64=media.get("audio_base64"),
        mime_type=media.get("mime_type"),
        provider=media.get("provider"),
        generation_ms=media.get("generation_ms"),
        error=media.get("error"),
    )


@router.post("/sessions", response_model=StartSessionResponse)
async def start_session(
    payload: StartSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StartSessionResponse:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    session = await get_session_manager().create_session(
        user_id=user.id,
        user_role=payload.user_role or role,
        recent_shipments=payload.recent_shipments,
    )
    create_session_record(db, session_id=session.id, user_id=user.id, user_role=payload.user_role or role)
    return StartSessionResponse(session_id=session.id, state="idle")


@router.post("/sessions/{session_id}/message", response_model=AssistantReply)
async def send_message(
    session_id: str,
    payload: SessionMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantReply:
    return await _compose_reply(
        session_id,
        user_id=user.id,
        message=payload.message,
        include_avatar=payload.include_avatar,
        include_audio=payload.include_audio,
        db=db,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ended = await get_session_manager().end_session(session_id, user_id=user.id)
    if not ended:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    end_session_record(db, session_id)


@router.websocket("/ws")
async def assistant_websocket(websocket: WebSocket, token: str = Query(...)) -> None:
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    manager = get_session_manager()
    session = await manager.create_session(user_id=user_id)
    service = AssistantService()

    async def send_json(data: dict[str, Any]) -> None:
        await websocket.send_text(json.dumps(data))

    greeting = get_assistant_config().greeting_message
    db_boot = SessionLocal()
    try:
        create_session_record(db_boot, session_id=session.id, user_id=user_id, user_role="")
    finally:
        db_boot.close()
    await send_json(
        {
            "type": "session_started",
            "session_id": session.id,
            "state": "idle",
            "greeting": greeting,
        }
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                await send_json({"type": "error", "message": "Invalid JSON payload"})
                continue

            event_type = (event.get("type") or "").strip().lower()
            if event_type == "ping":
                await send_json({"type": "pong"})
                continue
            if event_type == "end":
                await manager.end_session(session.id, user_id=user_id)
                db_end = SessionLocal()
                try:
                    end_session_record(db_end, session.id)
                finally:
                    db_end.close()
                await send_json({"type": "session_ended"})
                break
            if event_type != "message":
                await send_json({"type": "error", "message": "Unsupported event type"})
                continue

            message = (event.get("content") or "").strip()
            if not message:
                await send_json({"type": "error", "message": "Message is required"})
                continue

            enforce_assistant_rate_limit(user_id)
            await send_json({"type": "state", "state": "listening"})
            await send_json({"type": "state", "state": "thinking"})

            db = SessionLocal()
            try:
                touch_session_record(db, session.id)
                append_message(db, session_id=session.id, role="user", content=message)
                _, _, active_avatar = resolve_presenter_source(db)
                persona = active_avatar.persona if active_avatar else None
                result = service.generate_reply(session, message, persona=persona)
                text = (result.get("text") or "").strip() or (
                    "I'm not sure, but I can guide you to the right section."
                )
                speech = synthesize_speech(text)
                await send_json(
                    {
                        "type": "response_partial",
                        "text": text,
                        "state": "speaking",
                        "audio_base64": speech.get("audio_base64"),
                        "mime_type": speech.get("mime_type"),
                    }
                )
                media = await generate_avatar_media(db, text, include_audio=False)
                video_url = media.get("video_url")
                audio_base64 = media.get("audio_base64")
                mime_type = media.get("mime_type")
                media_error = media.get("error")
                await manager.add_exchange(session.id, user_text=message, assistant_text=text)
                append_message(
                    db,
                    session_id=session.id,
                    role="assistant",
                    content=text,
                    video_url=video_url,
                    provider=media.get("provider"),
                    generation_ms=media.get("generation_ms"),
                )
                await send_json(
                    {
                        "type": "response",
                        "text": text,
                        "state": "speaking",
                        "video_url": video_url,
                        "audio_base64": audio_base64,
                        "mime_type": mime_type,
                        "provider": media.get("provider"),
                        "generation_ms": media.get("generation_ms"),
                        "error": media_error,
                    }
                )
            finally:
                db.close()
            await send_json({"type": "state", "state": "idle"})
    except WebSocketDisconnect:
        await manager.end_session(session.id, user_id=user_id)
    except Exception as exc:
        logger.exception("Assistant websocket error: %s", exc)
        try:
            await send_json({"type": "error", "message": "Assistant session failed"})
        finally:
            await manager.end_session(session.id, user_id=user_id)
            await websocket.close(code=1011)
