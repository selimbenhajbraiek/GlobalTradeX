from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.notification import Notification, NotificationType
from models.user import User

router = APIRouter()

_admin_only = Depends(require_role(["admin"]))


class AdminNotifyBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    notification_type: str = "info"
    """If empty, send to all users (system-wide)."""
    user_ids: list[int] | None = None


@router.post("/notify", status_code=status.HTTP_201_CREATED)
def admin_notify(
    payload: AdminNotifyBody,
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> dict:
    """Create notifications for selected users or all users (admin only)."""
    try:
        ntype = NotificationType(payload.notification_type)
    except ValueError:
        allowed = ", ".join(t.value for t in NotificationType)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid notification_type. Allowed: {allowed}",
        ) from None

    if payload.user_ids:
        target_ids = payload.user_ids
        for uid in target_ids:
            if db.get(User, uid) is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User id {uid} not found",
                )
    else:
        target_ids = [row[0] for row in db.execute(select(User.id)).all()]

    created = 0
    for uid in target_ids:
        n = Notification(
            user_id=uid,
            title=payload.title,
            message=payload.message,
            notification_type=ntype,
        )
        db.add(n)
        created += 1
    db.commit()
    return {"created": created, "user_ids": target_ids}
