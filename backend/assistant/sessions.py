from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4


@dataclass
class AssistantSession:
    id: str
    user_id: int
    user_role: str = ""
    recent_shipments: list[Any] = field(default_factory=list)
    messages: list[dict[str, str]] = field(default_factory=list)
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SessionManager:
    """In-memory assistant sessions with inactivity expiry."""

    def __init__(self, *, ttl_seconds: int = 600, max_history: int = 10) -> None:
        self._sessions: dict[str, AssistantSession] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
        self._max_history = max_history
        self._lock = asyncio.Lock()

    async def create_session(
        self,
        *,
        user_id: int,
        user_role: str = "",
        recent_shipments: list[Any] | None = None,
    ) -> AssistantSession:
        async with self._lock:
            self._purge_expired_locked()
            session = AssistantSession(
                id=str(uuid4()),
                user_id=user_id,
                user_role=user_role or "",
                recent_shipments=list(recent_shipments or []),
            )
            self._sessions[session.id] = session
            return session

    async def get_session(self, session_id: str, *, user_id: int | None = None) -> AssistantSession | None:
        async with self._lock:
            self._purge_expired_locked()
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if user_id is not None and session.user_id != user_id:
                return None
            return session

    async def touch(self, session_id: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is not None:
                session.last_activity = datetime.now(timezone.utc)

    async def add_exchange(self, session_id: str, *, user_text: str, assistant_text: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            session.messages.append({"role": "user", "content": user_text})
            session.messages.append({"role": "assistant", "content": assistant_text})
            session.messages = session.messages[-self._max_history :]
            session.last_activity = datetime.now(timezone.utc)

    async def reset_session(self, session_id: str, *, user_id: int) -> bool:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None or session.user_id != user_id:
                return False
            session.messages.clear()
            session.last_activity = datetime.now(timezone.utc)
            return True

    async def end_session(self, session_id: str, *, user_id: int) -> bool:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None or session.user_id != user_id:
                return False
            del self._sessions[session_id]
            return True

    def _purge_expired_locked(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [sid for sid, s in self._sessions.items() if now - s.last_activity > self._ttl]
        for sid in expired:
            del self._sessions[sid]


_session_manager: SessionManager | None = None


def get_session_manager() -> SessionManager:
    global _session_manager
    if _session_manager is None:
        from config import get_settings

        settings = get_settings()
        _session_manager = SessionManager(ttl_seconds=settings.assistant_session_ttl_seconds)
    return _session_manager
