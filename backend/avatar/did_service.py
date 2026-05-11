from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

import httpx

from avatar.cache import get_talk_cache
from config import get_settings

logger = logging.getLogger(__name__)


class DIDService:
    """D-ID talking avatar integration (optional when API key is configured)."""

    def __init__(self, presenter_source_url: str | None = None) -> None:
        settings = get_settings()
        self._api_key = (settings.did_api_key or "").strip()
        self._presenter_url = (presenter_source_url or settings.did_presenter_url or "").strip()
        self._base_url = "https://api.d-id.com"

    @property
    def enabled(self) -> bool:
        return bool(self._api_key and self._presenter_url)

    async def create_talk(self, text: str, *, use_cache: bool = True) -> dict[str, Any]:
        if not self.enabled:
            return {"video_url": None, "error": "D-ID is not configured"}
        trimmed = (text or "").strip()[:900]
        cache = get_talk_cache()
        if use_cache:
            cached = cache.get(presenter_key=self._presenter_url, text=trimmed)
            if cached:
                return {"video_url": cached, "cached": True}

        payload = {
            "source_url": self._presenter_url,
            "script": {"type": "text", "input": trimmed},
            "config": {"fluent": True, "pad_audio": 0.0},
        }
        auth_token = base64.b64encode(f"{self._api_key}:".encode("utf-8")).decode("ascii")
        headers = {
            "Authorization": f"Basic {auth_token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                create = await client.post(f"{self._base_url}/talks", json=payload, headers=headers)
                create.raise_for_status()
                talk = create.json()
                talk_id = talk.get("id")
                if not talk_id:
                    return {"video_url": None, "error": "D-ID did not return a talk id"}

                for _ in range(30):
                    poll = await client.get(f"{self._base_url}/talks/{talk_id}", headers=headers)
                    poll.raise_for_status()
                    data = poll.json()
                    status = (data.get("status") or "").lower()
                    if status == "done":
                        result_url = data.get("result_url")
                        if result_url and use_cache:
                            cache.set(presenter_key=self._presenter_url, text=trimmed, video_url=result_url)
                        return {"video_url": result_url, "talk_id": talk_id}
                    if status in {"error", "rejected"}:
                        return {"video_url": None, "error": data.get("error", "D-ID talk failed")}
                    await asyncio.sleep(1)
                return {"video_url": None, "error": "D-ID talk timed out"}
        except Exception as exc:
            logger.exception("D-ID create_talk failed: %s", exc)
            return {"video_url": None, "error": str(exc)}
