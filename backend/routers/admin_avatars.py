from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from avatar.processor import DEFAULT_PERSONA, process_avatar_record, save_avatar_upload
from avatar.repository import get_latest_admin_avatar
from database import get_db
from models.assistant_avatar import AssistantAvatar, AssistantAvatarStatus
from models.user import User
from schemas.assistant_avatar import AssistantAvatarOut

router = APIRouter()

_admin_only = Depends(require_role(["admin"]))
BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _to_out(avatar: AssistantAvatar) -> AssistantAvatarOut:
    return AssistantAvatarOut(
        id=avatar.id,
        admin_id=avatar.admin_id,
        original_filename=avatar.original_filename,
        video_size=avatar.video_size,
        status=avatar.status,
        presenter_source_url=avatar.presenter_source_url,
        avatar_provider_id=avatar.avatar_provider_id,
        voice_id=avatar.voice_id,
        persona=avatar.persona or {},
        metadata=avatar.metadata_json or {},
        error_message=avatar.error_message,
        is_active=avatar.is_active,
        preview_url=f"/api/admin/avatars/{avatar.id}/preview",
        created_at=avatar.created_at,
        updated_at=avatar.updated_at,
    )


@router.get("/current", response_model=AssistantAvatarOut | None)
def get_current_admin_avatar(
    db: Session = Depends(get_db),
    user: User = _admin_only,
) -> AssistantAvatarOut | None:
    avatar = get_latest_admin_avatar(db, user.id)
    if avatar is None:
        return None
    return _to_out(avatar)


@router.post("", response_model=AssistantAvatarOut, status_code=status.HTTP_201_CREATED)
async def create_admin_avatar(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = _admin_only,
) -> AssistantAvatarOut:
    data = await file.read()
    try:
        rel_path, _ = save_avatar_upload(file.filename or "avatar.webm", data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    from uuid import uuid4

    avatar = AssistantAvatar(
        admin_id=user.id,
        original_filename=file.filename or "avatar.webm",
        video_path=rel_path,
        video_size=len(data),
        public_token=uuid4().hex,
        status=AssistantAvatarStatus.processing,
        persona=DEFAULT_PERSONA,
        metadata_json={},
        is_active=False,
    )
    db.add(avatar)
    db.commit()
    db.refresh(avatar)

    background_tasks.add_task(process_avatar_record, avatar.id)
    return _to_out(avatar)


@router.get("/{avatar_id}", response_model=AssistantAvatarOut)
def get_admin_avatar(
    avatar_id: int,
    db: Session = Depends(get_db),
    user: User = _admin_only,
) -> AssistantAvatarOut:
    avatar = db.get(AssistantAvatar, avatar_id)
    if avatar is None or avatar.admin_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return _to_out(avatar)


@router.get("/{avatar_id}/preview")
def preview_admin_avatar(
    avatar_id: int,
    db: Session = Depends(get_db),
    user: User = _admin_only,
) -> FileResponse:
    avatar = db.get(AssistantAvatar, avatar_id)
    if avatar is None or avatar.admin_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    abs_path = BACKEND_ROOT / avatar.video_path
    if not abs_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found")
    media_type = "video/mp4" if abs_path.suffix.lower() == ".mp4" else "video/webm"
    return FileResponse(abs_path, media_type=media_type, filename=avatar.original_filename)
