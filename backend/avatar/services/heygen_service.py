from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from avatar.cache import get_talk_cache
from avatar.providers.heygen import HeyGenProvider
from assistant.config_store import get_assistant_config
from config import get_settings

logger = logging.getLogger(__name__)

_inflight: dict[str, asyncio.Task] = {}


def _format_provider_error(error: Any) -> str:
    if error is None:
        return ""
    if isinstance(error, str):
        return error
    if isinstance(error, dict):
        for key in ("message", "detail", "error"):
            value = error.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return str(error)
    return str(error)
_inflight_lock = asyncio.Lock()


class HeyGenService:
    """Generate and poll HeyGen talking avatar videos."""

    def __init__(self) -> None:
        settings = get_settings()
        self._provider = HeyGenProvider(api_key=settings.heygen_api_key)
        self._settings = settings

    @property
    def enabled(self) -> bool:
        return self._provider.enabled and bool(self._resolve_avatar_id())

    def _resolve_avatar_id(self) -> str:
        runtime = get_assistant_config()
        return (runtime.heygen_avatar_id or self._settings.heygen_avatar_id or "").strip()

    def _resolve_voice_id(self) -> str | None:
        runtime = get_assistant_config()
        voice = (runtime.heygen_voice_id or self._settings.heygen_voice_id or "").strip()
        return voice or None

    def _cache_key(self) -> str:
        avatar_id = self._resolve_avatar_id()
        voice_id = self._resolve_voice_id() or "default"
        return f"heygen:{avatar_id}:{voice_id}"

    async def get_avatar_profile(self) -> dict[str, Any]:
        avatar_id = self._resolve_avatar_id()
        if not avatar_id:
            return {"avatar_id": "", "avatar_name": "", "preview_image_url": None, "preview_video_url": None}
        avatars = await self._provider.list_avatars()
        for avatar in avatars:
            if not isinstance(avatar, dict):
                continue
            if (avatar.get("avatar_id") or "").strip() == avatar_id:
                return {
                    "avatar_id": avatar_id,
                    "avatar_name": avatar.get("avatar_name") or avatar_id,
                    "preview_image_url": avatar.get("preview_image_url"),
                    "preview_video_url": avatar.get("preview_video_url"),
                    "gender": avatar.get("gender"),
                }
        return {
            "avatar_id": avatar_id,
            "avatar_name": avatar_id,
            "preview_image_url": None,
            "preview_video_url": None,
        }

    async def create_talk_video(self, text: str) -> dict[str, Any]:
        trimmed = (text or "").strip()
        if not trimmed:
            return {"video_url": None, "error": "Text is required"}
        if not self.enabled:
            return {"video_url": None, "error": "HeyGen assistant is not configured"}

        cache = get_talk_cache()
        cached = cache.get(presenter_key=self._cache_key(), text=trimmed)
        if cached:
            return {"video_url": cached, "cached": True, "provider": "heygen"}

        key = f"{self._cache_key()}:{trimmed.lower()}"
        async with _inflight_lock:
            existing = _inflight.get(key)
            if existing is not None and not existing.done():
                try:
                    return await existing
                except Exception as exc:
                    return {"video_url": None, "error": str(exc)}

            task = asyncio.create_task(self._generate_video(trimmed))
            _inflight[key] = task

        try:
            result = await task
            return result
        finally:
            async with _inflight_lock:
                if _inflight.get(key) is task:
                    del _inflight[key]

    async def _generate_video(self, text: str) -> dict[str, Any]:
        started = time.perf_counter()
        created = await self._provider.create_avatar_video(
            avatar_id=self._resolve_avatar_id(),
            text=text,
            voice_id=self._resolve_voice_id(),
        )
        video_id = created.get("video_id")
        if not video_id:
            return {
                "video_url": None,
                "error": _format_provider_error(created.get("error")) or "HeyGen video creation failed",
                "provider": "heygen",
                "generation_ms": int((time.perf_counter() - started) * 1000),
            }

        for _ in range(45):
            status = await self._provider.get_video_status(video_id)
            state = (status.get("status") or "").lower()
            if state in {"completed", "complete", "done"}:
                video_url = status.get("video_url")
                if video_url:
                    get_talk_cache().set(
                        presenter_key=self._cache_key(),
                        text=text,
                        video_url=video_url,
                    )
                return {
                    "video_url": video_url,
                    "thumbnail_url": status.get("thumbnail_url"),
                    "provider": "heygen",
                    "generation_ms": int((time.perf_counter() - started) * 1000),
                    "error": None if video_url else "HeyGen completed without a video URL",
                }
            if state in {"failed", "error"}:
                return {
                    "video_url": None,
                    "error": _format_provider_error(status.get("error")) or "HeyGen video generation failed",
                    "provider": "heygen",
                    "generation_ms": int((time.perf_counter() - started) * 1000),
                }
            await asyncio.sleep(1)

        return {
            "video_url": None,
            "error": "HeyGen video generation timed out",
            "provider": "heygen",
            "generation_ms": int((time.perf_counter() - started) * 1000),
        }


_heygen_service: HeyGenService | None = None


def get_heygen_service() -> HeyGenService:
    global _heygen_service
    if _heygen_service is None:
        _heygen_service = HeyGenService()
    return _heygen_service
