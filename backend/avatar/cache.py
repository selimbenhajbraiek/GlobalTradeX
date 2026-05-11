from __future__ import annotations

import hashlib
import time
from collections import OrderedDict
from dataclasses import dataclass

from config import get_settings


@dataclass
class CacheEntry:
    video_url: str
    expires_at: float


class TalkResponseCache:
    """In-memory cache for generated avatar video URLs."""

    def __init__(self, *, max_entries: int = 200, ttl_seconds: int = 3600) -> None:
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._items: OrderedDict[str, CacheEntry] = OrderedDict()

    def _key(self, *, presenter_key: str, text: str) -> str:
        normalized = " ".join((text or "").strip().lower().split())
        return hashlib.sha256(f"{presenter_key}:{normalized}".encode("utf-8")).hexdigest()

    def get(self, *, presenter_key: str, text: str) -> str | None:
        key = self._key(presenter_key=presenter_key, text=text)
        entry = self._items.get(key)
        if entry is None:
            return None
        if entry.expires_at < time.time():
            del self._items[key]
            return None
        self._items.move_to_end(key)
        return entry.video_url

    def set(self, *, presenter_key: str, text: str, video_url: str) -> None:
        key = self._key(presenter_key=presenter_key, text=text)
        self._items[key] = CacheEntry(video_url=video_url, expires_at=time.time() + self._ttl_seconds)
        self._items.move_to_end(key)
        while len(self._items) > self._max_entries:
            self._items.popitem(last=False)


_talk_cache: TalkResponseCache | None = None


def get_talk_cache() -> TalkResponseCache:
    global _talk_cache
    if _talk_cache is None:
        settings = get_settings()
        _talk_cache = TalkResponseCache(ttl_seconds=settings.assistant_video_cache_ttl_seconds)
    return _talk_cache
