from __future__ import annotations

import asyncio
import base64
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from avatar.repository import deactivate_all_avatars
from config import get_settings
from database import SessionLocal
from models.assistant_avatar import AssistantAvatar, AssistantAvatarStatus

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent
AVATAR_UPLOAD_DIR = BACKEND_ROOT / "uploads" / "avatars"
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_BYTES = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}

DEFAULT_PERSONA = {
    "tone": "friendly",
    "style": "concise",
    "expertise": "platform expert",
}


def _auth_headers(api_key: str) -> dict[str, str]:
    token = base64.b64encode(f"{api_key}:".encode("utf-8")).decode("ascii")
    return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}


def _public_source_url(public_token: str) -> str | None:
    settings = get_settings()
    base = (settings.public_api_base_url or "").strip().rstrip("/")
    if not base:
        return None
    return f"{base}/api/avatar/presenters/{public_token}/source"


def _extract_frame_jpeg(video_path: Path) -> bytes | None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return None
    try:
        proc = subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                str(video_path),
                "-vframes",
                "1",
                "-f",
                "image2pipe",
                "-vcodec",
                "mjpeg",
                "-",
            ],
            capture_output=True,
            check=True,
            timeout=60,
        )
        return proc.stdout or None
    except Exception as exc:
        logger.warning("ffmpeg frame extraction failed: %s", exc)
        return None


def _register_did_presenter(*, api_key: str, source_url: str | None, image_bytes: bytes | None) -> dict[str, Any]:
    headers = _auth_headers(api_key)
    payload: dict[str, Any] = {}
    if source_url:
        payload["source_url"] = source_url
    elif image_bytes:
        encoded = base64.standard_b64encode(image_bytes).decode("ascii")
        payload["image"] = f"data:image/jpeg;base64,{encoded}"
    else:
        return {"presenter_source_url": None, "avatar_provider_id": None, "error": "No presenter source available"}

    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post("https://api.d-id.com/images", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            presenter_url = data.get("url") or data.get("source_url") or source_url
            return {
                "presenter_source_url": presenter_url,
                "avatar_provider_id": data.get("id"),
                "error": None,
            }
    except Exception as exc:
        logger.exception("D-ID presenter registration failed: %s", exc)
        return {
            "presenter_source_url": source_url,
            "avatar_provider_id": None,
            "error": str(exc),
        }


def save_avatar_upload(file_name: str, data: bytes) -> tuple[str, str]:
    suffix = Path(file_name or "avatar.webm").suffix.lower() or ".webm"
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported video type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    if len(data) > MAX_AVATAR_BYTES:
        raise ValueError("Video exceeds 50MB limit")

    stored_name = f"{uuid4().hex}{suffix}"
    rel_path = f"uploads/avatars/{stored_name}"
    abs_path = BACKEND_ROOT / rel_path
    abs_path.write_bytes(data)
    return rel_path, stored_name


async def process_avatar_record(avatar_id: int) -> None:
    await asyncio.to_thread(_process_avatar_sync, avatar_id)


def _process_avatar_sync(avatar_id: int) -> None:
    db = SessionLocal()
    try:
        avatar = db.get(AssistantAvatar, avatar_id)
        if avatar is None:
            return

        avatar.status = AssistantAvatarStatus.processing
        avatar.error_message = None
        db.commit()

        settings = get_settings()
        api_key = (settings.did_api_key or "").strip()
        video_path = BACKEND_ROOT / avatar.video_path
        if not video_path.is_file():
            avatar.status = AssistantAvatarStatus.error
            avatar.error_message = "Uploaded video file was not found."
            db.commit()
            return

        public_url = _public_source_url(avatar.public_token)
        image_bytes = _extract_frame_jpeg(video_path)
        presenter_source_url = public_url
        provider_id = None
        provider_error = None

        if api_key:
            result = _register_did_presenter(
                api_key=api_key,
                source_url=public_url,
                image_bytes=image_bytes if public_url is None else None,
            )
            presenter_source_url = result.get("presenter_source_url") or public_url
            provider_id = result.get("avatar_provider_id")
            provider_error = result.get("error")
        elif public_url:
            presenter_source_url = public_url
        elif image_bytes:
            presenter_source_url = None
        else:
            avatar.status = AssistantAvatarStatus.error
            avatar.error_message = (
                "Could not prepare a presenter source. Set PUBLIC_API_BASE_URL and/or DID_API_KEY, "
                "or install ffmpeg for frame extraction."
            )
            db.commit()
            return

        avatar.presenter_source_url = presenter_source_url
        avatar.avatar_provider_id = provider_id
        avatar.voice_id = (settings.elevenlabs_voice_id or "").strip() or None
        avatar.persona = avatar.persona or DEFAULT_PERSONA
        avatar.metadata_json = {
            **(avatar.metadata_json or {}),
            "provider": "d-id" if api_key else "local",
            "has_frame": bool(image_bytes),
        }

        if provider_error and not presenter_source_url:
            avatar.status = AssistantAvatarStatus.error
            avatar.error_message = provider_error
        else:
            deactivate_all_avatars(db)
            avatar.is_active = True
            avatar.status = AssistantAvatarStatus.ready
            avatar.error_message = provider_error

        db.commit()
    except Exception as exc:
        logger.exception("Avatar processing failed for id=%s: %s", avatar_id, exc)
        avatar = db.get(AssistantAvatar, avatar_id)
        if avatar is not None:
            avatar.status = AssistantAvatarStatus.error
            avatar.error_message = str(exc)
            db.commit()
    finally:
        db.close()
