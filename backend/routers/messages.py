from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user
from database import get_db
from models.message import Message, MessageThread, ThreadParticipant
from models.notification import Notification, NotificationType
from models.shipment import Shipment
from models.user import User
from schemas.message import MessageCreate, MessageOut, ThreadCreate, ThreadDetailOut, ThreadOut, ParticipantOut

router = APIRouter()

DEFAULT_PREFS = {
    "email_digest": True,
    "shipment_alerts": True,
    "customs_alerts": True,
    "ai_summaries": True,
}


def _participant_out(user: User) -> ParticipantOut:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return ParticipantOut(id=user.id, full_name=user.full_name, email=user.email, role=role)


def _notify_message(db: Session, recipient_id: int, sender: User, thread: MessageThread, preview: str) -> None:
    if recipient_id == sender.id:
        return
    ref = ""
    if thread.shipment_id:
        sh = db.get(Shipment, thread.shipment_id)
        if sh and sh.reference:
            ref = f" ({sh.reference})"
    db.add(
        Notification(
            user_id=recipient_id,
            title=f"New message from {sender.full_name}",
            message=preview[:500],
            notification_type=NotificationType.info,
            shipment_id=thread.shipment_id,
        )
    )


def _thread_out(db: Session, thread: MessageThread, current_user_id: int) -> ThreadOut:
    participants = list(
        db.scalars(
            select(User)
            .join(ThreadParticipant, ThreadParticipant.user_id == User.id)
            .where(ThreadParticipant.thread_id == thread.id)
        ).all()
    )
    last_msg = db.scalar(
        select(Message)
        .where(Message.thread_id == thread.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    my_part = db.scalar(
        select(ThreadParticipant).where(
            ThreadParticipant.thread_id == thread.id,
            ThreadParticipant.user_id == current_user_id,
        )
    )
    unread = 0
    if my_part and last_msg and last_msg.sender_id != current_user_id:
        if my_part.last_read_at is None:
            unread = len(
                list(
                    db.scalars(
                        select(Message.id).where(
                            Message.thread_id == thread.id,
                            Message.sender_id != current_user_id,
                        )
                    ).all()
                )
            )
        elif last_msg.created_at > my_part.last_read_at:
            unread = len(
                list(
                    db.scalars(
                        select(Message.id).where(
                            Message.thread_id == thread.id,
                            Message.sender_id != current_user_id,
                            Message.created_at > my_part.last_read_at,
                        )
                    ).all()
                )
            )

    shipment_ref = None
    if thread.shipment_id:
        sh = db.get(Shipment, thread.shipment_id)
        shipment_ref = sh.reference if sh else None

    other = next((p for p in participants if p.id != current_user_id), None)
    subject = thread.subject
    if not subject and other:
        subject = other.full_name
    if not subject and shipment_ref:
        subject = f"Shipment {shipment_ref}"

    return ThreadOut(
        id=thread.id,
        shipment_id=thread.shipment_id,
        subject=subject,
        shipment_reference=shipment_ref,
        updated_at=thread.updated_at,
        unread_count=unread,
        last_message=last_msg.body if last_msg else None,
        last_message_at=last_msg.created_at if last_msg else None,
        participants=[_participant_out(p) for p in participants],
    )


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ThreadOut]:
    thread_ids = list(
        db.scalars(
            select(ThreadParticipant.thread_id).where(ThreadParticipant.user_id == current.id)
        ).all()
    )
    if not thread_ids:
        return []
    threads = list(
        db.scalars(
            select(MessageThread)
            .where(MessageThread.id.in_(thread_ids))
            .order_by(MessageThread.updated_at.desc())
        ).all()
    )
    return [_thread_out(db, t, current.id) for t in threads]


@router.get("/threads/{thread_id}", response_model=ThreadDetailOut)
def get_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ThreadDetailOut:
    thread = db.get(MessageThread, thread_id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    is_member = db.scalar(
        select(ThreadParticipant).where(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == current.id,
        )
    )
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

    base = _thread_out(db, thread, current.id)
    rows = list(
        db.scalars(
            select(Message)
            .options(joinedload(Message.sender))
            .where(Message.thread_id == thread_id)
            .order_by(Message.created_at.asc())
        ).all()
    )
    messages = [
        MessageOut(
            id=m.id,
            thread_id=m.thread_id,
            sender_id=m.sender_id,
            body=m.body,
            created_at=m.created_at,
            sender_name=m.sender.full_name if m.sender else None,
            is_mine=m.sender_id == current.id,
        )
        for m in rows
    ]
    now = datetime.now(timezone.utc)
    if is_member:
        is_member.last_read_at = now
        thread.updated_at = thread.updated_at
    db.commit()

    return ThreadDetailOut(**base.model_dump(), messages=messages)


@router.post("/threads", response_model=ThreadDetailOut, status_code=status.HTTP_201_CREATED)
def create_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ThreadDetailOut:
    if payload.recipient_user_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")
    recipient = db.get(User, payload.recipient_user_id)
    if not recipient or not recipient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    if payload.shipment_id is not None:
        sh = db.get(Shipment, payload.shipment_id)
        if not sh:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    existing = None
    if payload.shipment_id:
        for tid in db.scalars(
            select(MessageThread.id).where(MessageThread.shipment_id == payload.shipment_id)
        ).all():
            parts = set(
                db.scalars(
                    select(ThreadParticipant.user_id).where(ThreadParticipant.thread_id == tid)
                ).all()
            )
            if parts == {current.id, payload.recipient_user_id}:
                existing = db.get(MessageThread, tid)
                break
    else:
        for tid in db.scalars(
            select(ThreadParticipant.thread_id).where(ThreadParticipant.user_id == current.id)
        ).all():
            parts = set(
                db.scalars(
                    select(ThreadParticipant.user_id).where(ThreadParticipant.thread_id == tid)
                ).all()
            )
            if parts == {current.id, payload.recipient_user_id} and len(parts) == 2:
                sh = db.get(MessageThread, tid)
                if sh and sh.shipment_id is None:
                    existing = sh
                    break

    if existing:
        msg = Message(thread_id=existing.id, sender_id=current.id, body=payload.body.strip())
        db.add(msg)
        existing.updated_at = datetime.now(timezone.utc)
        _notify_message(db, payload.recipient_user_id, current, existing, payload.body.strip())
        db.commit()
        db.refresh(existing)
        return get_thread(existing.id, db, current)

    thread = MessageThread(
        shipment_id=payload.shipment_id,
        subject=payload.subject,
    )
    db.add(thread)
    db.flush()
    now = datetime.now(timezone.utc)
    db.add(ThreadParticipant(thread_id=thread.id, user_id=current.id, last_read_at=now))
    db.add(ThreadParticipant(thread_id=thread.id, user_id=payload.recipient_user_id, last_read_at=None))
    msg = Message(thread_id=thread.id, sender_id=current.id, body=payload.body.strip())
    db.add(msg)
    _notify_message(db, payload.recipient_user_id, current, thread, payload.body.strip())
    db.commit()
    db.refresh(thread)
    return get_thread(thread.id, db, current)


@router.post("/threads/{thread_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    thread_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MessageOut:
    thread = db.get(MessageThread, thread_id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    is_member = db.scalar(
        select(ThreadParticipant).where(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == current.id,
        )
    )
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

    body = payload.body.strip()
    msg = Message(thread_id=thread_id, sender_id=current.id, body=body)
    db.add(msg)
    thread.updated_at = datetime.now(timezone.utc)
    is_member.last_read_at = datetime.now(timezone.utc)

    others = list(
        db.scalars(
            select(ThreadParticipant.user_id).where(
                ThreadParticipant.thread_id == thread_id,
                ThreadParticipant.user_id != current.id,
            )
        ).all()
    )
    for uid in others:
        _notify_message(db, uid, current, thread, body)
    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        thread_id=msg.thread_id,
        sender_id=msg.sender_id,
        body=msg.body,
        created_at=msg.created_at,
        sender_name=current.full_name,
        is_mine=True,
    )


@router.get("/contacts", response_model=list[ParticipantOut])
def list_contacts(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ParticipantOut]:
    """Active users the current user may start a conversation with."""
    rows = list(
        db.scalars(
            select(User)
            .where(User.is_active.is_(True), User.id != current.id)
            .order_by(User.full_name.asc())
        ).all()
    )
    return [_participant_out(u) for u in rows]
