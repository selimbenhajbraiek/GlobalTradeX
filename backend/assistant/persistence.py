from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.assistant_session_record import AssistantMessageRecord, AssistantSessionRecord


def create_session_record(
    db: Session,
    *,
    session_id: str,
    user_id: int,
    user_role: str,
) -> AssistantSessionRecord:
    row = AssistantSessionRecord(id=session_id, user_id=user_id, user_role=user_role or "")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def touch_session_record(db: Session, session_id: str) -> None:
    row = db.get(AssistantSessionRecord, session_id)
    if row is None:
        return
    row.last_activity_at = datetime.now(timezone.utc)
    db.commit()


def end_session_record(db: Session, session_id: str) -> None:
    row = db.get(AssistantSessionRecord, session_id)
    if row is None:
        return
    row.ended_at = datetime.now(timezone.utc)
    row.last_activity_at = row.ended_at
    db.commit()


def append_message(
    db: Session,
    *,
    session_id: str,
    role: str,
    content: str,
    video_url: str | None = None,
    provider: str | None = None,
    generation_ms: int | None = None,
) -> None:
    row = db.get(AssistantSessionRecord, session_id)
    if row is None:
        return
    db.add(
        AssistantMessageRecord(
            session_id=session_id,
            role=role,
            content=content,
            video_url=video_url,
            provider=provider,
            generation_ms=generation_ms,
        )
    )
    row.last_activity_at = datetime.now(timezone.utc)
    db.commit()


def recent_messages_for_user(db: Session, user_id: int, *, limit: int = 20) -> list[AssistantMessageRecord]:
    return list(
        db.scalars(
            select(AssistantMessageRecord)
            .join(AssistantSessionRecord, AssistantSessionRecord.id == AssistantMessageRecord.session_id)
            .where(AssistantSessionRecord.user_id == user_id)
            .order_by(AssistantMessageRecord.created_at.desc())
            .limit(limit)
        )
    )
