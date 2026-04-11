from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models.notification import Notification
from models.user import User

router = APIRouter()


@router.get("")
def list_notifications(
    limit: int = Query(5, ge=1, le=100),
    unread_only: bool = Query(True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    q = select(Notification).where(Notification.user_id == current.id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    q = q.order_by(Notification.created_at.desc()).limit(limit)
    rows = list(db.scalars(q).all())
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type.value,
            "is_read": n.is_read,
            "created_at": n.created_at,
            "shipment_id": n.shipment_id,
        }
        for n in rows
    ]
