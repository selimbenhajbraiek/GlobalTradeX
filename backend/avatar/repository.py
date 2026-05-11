from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from models.assistant_avatar import AssistantAvatar, AssistantAvatarStatus


def get_active_avatar(db: Session) -> AssistantAvatar | None:
    return db.scalar(
        select(AssistantAvatar)
        .where(AssistantAvatar.is_active.is_(True), AssistantAvatar.status == AssistantAvatarStatus.ready)
        .order_by(AssistantAvatar.updated_at.desc())
    )


def get_avatar_by_id(db: Session, avatar_id: int) -> AssistantAvatar | None:
    return db.get(AssistantAvatar, avatar_id)


def get_avatar_by_token(db: Session, public_token: str) -> AssistantAvatar | None:
    return db.scalar(select(AssistantAvatar).where(AssistantAvatar.public_token == public_token))


def get_latest_admin_avatar(db: Session, admin_id: int) -> AssistantAvatar | None:
    return db.scalar(
        select(AssistantAvatar)
        .where(AssistantAvatar.admin_id == admin_id)
        .order_by(AssistantAvatar.created_at.desc())
    )


def deactivate_all_avatars(db: Session) -> None:
    db.execute(update(AssistantAvatar).where(AssistantAvatar.is_active.is_(True)).values(is_active=False))
