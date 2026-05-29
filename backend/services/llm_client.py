"""Shared Google Gemini client (OpenAI-compatible API)."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from config import Settings, get_settings

if TYPE_CHECKING:
    from openai import OpenAI


def llm_api_key(settings: Settings | None = None) -> str:
    s = settings or get_settings()
    return (s.google_api_key or "").strip()


def default_llm_model(settings: Settings | None = None) -> str:
    s = settings or get_settings()
    return (s.gemini_model or "gemini-2.5-flash").strip()


@lru_cache
def create_llm_client() -> OpenAI | None:
    settings = get_settings()
    key = llm_api_key(settings)
    if not key:
        return None
    from openai import OpenAI

    base = (settings.gemini_base_url or "").strip()
    if base and not base.endswith("/"):
        base = f"{base}/"
    return OpenAI(api_key=key, base_url=base or None)


def reset_llm_client_cache() -> None:
    create_llm_client.cache_clear()
