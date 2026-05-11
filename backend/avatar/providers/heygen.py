from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class HeyGenProvider:
    """Low-level HeyGen HTTP client."""

    def __init__(self, *, api_key: str, base_url: str = "https://api.heygen.com") -> None:
        self._api_key = (api_key or "").strip()
        self._base_url = base_url.rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        return {"accept": "application/json", "x-api-key": self._api_key, "content-type": "application/json"}

    @staticmethod
    def _format_http_error(response: httpx.Response) -> str:
        try:
            body = response.json()
        except Exception:
            return f"HeyGen request failed with status {response.status_code}"
        if isinstance(body, dict):
            error = body.get("error")
            if isinstance(error, dict):
                message = error.get("message") or error.get("code")
                if message:
                    return str(message)
            if body.get("message"):
                return str(body["message"])
        return f"HeyGen request failed with status {response.status_code}"

    async def list_voices(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self._base_url}/v2/voices", headers=self._headers())
                response.raise_for_status()
                body = response.json()
                data = body.get("data") if isinstance(body, dict) else None
                voices = data.get("voices") if isinstance(data, dict) else None
                return voices if isinstance(voices, list) else []
        except Exception as exc:
            logger.exception("HeyGen list_voices failed: %s", exc)
            return []

    async def list_avatars(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self._base_url}/v2/avatars", headers=self._headers())
                response.raise_for_status()
                body = response.json()
                data = body.get("data") if isinstance(body, dict) else None
                avatars = data.get("avatars") if isinstance(data, dict) else None
                return avatars if isinstance(avatars, list) else []
        except Exception as exc:
            logger.exception("HeyGen list_avatars failed: %s", exc)
            return []

    async def resolve_voice_id(self, preferred_voice_id: str | None = None) -> str | None:
        preferred = (preferred_voice_id or "").strip()
        if preferred:
            return preferred
        voices = await self.list_voices()
        for voice in voices:
            if not isinstance(voice, dict):
                continue
            voice_id = (voice.get("voice_id") or "").strip()
            language = str(voice.get("language") or "").lower()
            if voice_id and language.startswith("english"):
                return voice_id
        for voice in voices:
            if isinstance(voice, dict) and (voice.get("voice_id") or "").strip():
                return str(voice["voice_id"]).strip()
        return None

    async def create_avatar_video(
        self,
        *,
        avatar_id: str,
        text: str,
        voice_id: str | None = None,
        title: str = "GlobalTradeX Assistant",
    ) -> dict[str, Any]:
        if not self.enabled:
            return {"video_id": None, "error": "HEYGEN_API_KEY not configured"}
        if not avatar_id:
            return {"video_id": None, "error": "HeyGen avatar id is not configured"}

        resolved_voice = await self.resolve_voice_id(voice_id)
        if not resolved_voice:
            return {
                "video_id": None,
                "error": "HeyGen voice_id is required. Set HEYGEN_VOICE_ID or choose a voice in AI Avatar Settings.",
            }

        payload = {
            "title": title,
            "dimension": {"width": 1280, "height": 720},
            "video_inputs": [
                {
                    "character": {
                        "type": "avatar",
                        "avatar_id": avatar_id,
                        "avatar_style": "normal",
                    },
                    "voice": {
                        "type": "text",
                        "input_text": text[:900],
                        "voice_id": resolved_voice,
                    },
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    f"{self._base_url}/v2/video/generate",
                    headers=self._headers(),
                    json=payload,
                )
                if response.status_code >= 400:
                    return {"video_id": None, "error": self._format_http_error(response)}
                body = response.json()
                data = body.get("data") if isinstance(body.get("data"), dict) else body
                video_id = data.get("video_id") if isinstance(data, dict) else None
                if not video_id and isinstance(body, dict):
                    video_id = body.get("video_id")
                if not video_id:
                    return {"video_id": None, "error": "HeyGen did not return a video id"}
                return {"video_id": video_id, "error": None, "voice_id": resolved_voice}
        except Exception as exc:
            logger.exception("HeyGen create_avatar_video failed: %s", exc)
            return {"video_id": None, "error": str(exc)}

    async def get_video_status(self, video_id: str) -> dict[str, Any]:
        if not self.enabled:
            return {"status": "failed", "error": "HEYGEN_API_KEY not configured"}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self._base_url}/v1/video_status.get",
                    headers={"accept": "application/json", "x-api-key": self._api_key},
                    params={"video_id": video_id},
                )
                if response.status_code >= 400:
                    return {"status": "failed", "error": self._format_http_error(response)}
                body = response.json()
                data = body.get("data") if isinstance(body.get("data"), dict) else body
                if not isinstance(data, dict):
                    return {"status": "failed", "error": "Unexpected HeyGen status payload"}
                return {
                    "status": (data.get("status") or "").lower(),
                    "video_url": data.get("video_url"),
                    "thumbnail_url": data.get("thumbnail_url"),
                    "error": data.get("error"),
                }
        except Exception as exc:
            logger.exception("HeyGen get_video_status failed: %s", exc)
            return {"status": "failed", "error": str(exc)}
