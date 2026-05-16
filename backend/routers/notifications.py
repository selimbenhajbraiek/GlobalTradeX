from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models.notification import Notification
from models.user import User

router = APIRouter()


def _serialize(n: Notification) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "type": n.notification_type.value,
        "is_read": n.is_read,
        "created_at": n.created_at,
        "shipment_id": n.shipment_id,
    }


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
    return [_serialize(n) for n in rows]


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    n = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current.id,
        )
    )
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return _serialize(n)


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == current.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return {"updated": int(result.rowcount or 0)}
