from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.assistant_session_record import AssistantMessageRecord, AssistantSessionRecord


def build_assistant_metrics(db: Session) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=30)

    sessions_count = db.scalar(
        select(func.count()).select_from(AssistantSessionRecord).where(AssistantSessionRecord.started_at >= since)
    ) or 0
    messages_count = db.scalar(
        select(func.count()).select_from(AssistantMessageRecord).where(AssistantMessageRecord.created_at >= since)
    ) or 0
    failed_generations = db.scalar(
        select(func.count())
        .select_from(AssistantMessageRecord)
        .where(
            AssistantMessageRecord.created_at >= since,
            AssistantMessageRecord.role == "assistant",
            AssistantMessageRecord.video_url.is_(None),
            AssistantMessageRecord.provider.is_not(None),
        )
    ) or 0
    avg_generation_ms = db.scalar(
        select(func.avg(AssistantMessageRecord.generation_ms)).where(
            AssistantMessageRecord.created_at >= since,
            AssistantMessageRecord.generation_ms.is_not(None),
        )
    )
    user_questions = db.scalars(
        select(AssistantMessageRecord.content)
        .where(AssistantMessageRecord.created_at >= since, AssistantMessageRecord.role == "user")
        .order_by(AssistantMessageRecord.created_at.desc())
        .limit(200)
    ).all()
    top_questions = [question for question, _ in Counter(user_questions).most_common(8)]

    return {
        "window_days": 30,
        "sessions": int(sessions_count),
        "messages": int(messages_count),
        "failed_generations": int(failed_generations),
        "average_response_ms": int(avg_generation_ms or 0),
        "top_questions": top_questions,
    }
