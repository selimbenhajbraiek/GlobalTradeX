import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.notification import Notification, NotificationType
from models.product import Product
from models.shipment import CargoType, Shipment, ShipmentStatus, TransportMode
from models.shipment_product import ShipmentProduct
from models.user import User, UserRole
from schemas.shipment import (
    ShipmentCreate,
    ShipmentDetailResponse,
    ShipmentDocumentBrief,
    ShipmentNotificationBrief,
    ShipmentOwnerBrief,
    ShipmentResponse,
    ShipmentStatusUpdateBody,
    ShipmentUpdate,
)
from services.email_service import EmailService
from services.sms_service import SMSService

router = APIRouter()

_shipment_creator = Depends(require_role(["importateur", "exportateur", "admin"]))
_status_updater = Depends(require_role(["transitaire", "admin"]))


_ALLOWED_STATUS_TRANSITIONS: dict[ShipmentStatus, frozenset[ShipmentStatus]] = {
    ShipmentStatus.pending: frozenset({ShipmentStatus.in_transit}),
    ShipmentStatus.in_transit: frozenset(
        {
            ShipmentStatus.customs_hold,
            ShipmentStatus.delivered,
            ShipmentStatus.delayed,
        }
    ),
    ShipmentStatus.customs_hold: frozenset(
        {
            ShipmentStatus.in_transit,
            ShipmentStatus.delivered,
        }
    ),
    ShipmentStatus.delayed: frozenset({ShipmentStatus.in_transit, ShipmentStatus.cancelled}),
    ShipmentStatus.delivered: frozenset(),
    ShipmentStatus.cancelled: frozenset(),
}


def _parse_enum(enum_cls, value: str, field: str):
    try:
        return enum_cls(value)
    except ValueError:
        allowed = ", ".join(e.value for e in enum_cls)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field}: {value}. Expected one of: {allowed}",
        ) from None


def _apply_shipment_update(s: Shipment, data: dict) -> None:
    enum_map = {
        "cargo_type": CargoType,
        "transport_mode": TransportMode,
        "status": ShipmentStatus,
    }
    for key, value in data.items():
        if value is None:
            continue
        if key in enum_map:
            setattr(s, key, _parse_enum(enum_map[key], value, key))
        else:
            setattr(s, key, value)


def _is_admin(user: User) -> bool:
    return user.role == UserRole.admin


def _can_view_shipment(current: User, s: Shipment | None) -> bool:
    if s is None:
        return False
    if _is_admin(current):
        return True
    if current.role in (UserRole.courtier, UserRole.transitaire):
        return True
    if s.owner_id == current.id:
        return True
    if current.role == UserRole.exportateur and s.exporter_user_id == current.id:
        return True
    return False


def _can_mutate_shipment(current: User, s: Shipment | None) -> bool:
    if s is None:
        return False
    if _is_admin(current):
        return True
    return s.owner_id == current.id


def _generate_unique_reference(db: Session) -> str:
    for _ in range(40):
        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        n = random.randint(0, 99999)
        ref = f"GTX-{day}-{n:05d}"
        cnt = db.scalar(select(func.count()).select_from(Shipment).where(Shipment.reference == ref))
        if not cnt:
            return ref
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate a unique shipment reference",
    )


def _send_shipment_created_channels(owner: User, s: Shipment) -> None:
    subject = f"GlobalTradeX — Shipment {s.reference} created"
    lines = [
        f"Hello {owner.full_name},",
        "",
        "Your shipment has been registered in GlobalTradeX.",
        "",
        f"Reference: {s.reference}",
        f"Origin: {s.origin}",
        f"Destination: {s.destination}",
        f"Transport mode: {s.transport_mode.value}",
        f"Status: {s.status.value}",
    ]
    if s.estimated_value is not None:
        lines.append(f"Estimated value: {s.estimated_value} {s.currency}")
    if s.freight_estimate_usd is not None:
        lines.append(f"Freight estimate (USD): {s.freight_estimate_usd}")
    body = "\n".join(lines)
    try:
        EmailService().send(owner.email, subject, body)
    except Exception:
        pass
    phone = (owner.phone or "").strip()
    if phone:
        try:
            msg = (
                f"GlobalTradeX: shipment {s.reference} created "
                f"({s.origin} → {s.destination})."
            )
            SMSService().send(phone, msg)
        except Exception:
            pass


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current: User = _shipment_creator,
) -> Shipment:
    raw = payload.model_dump()
    product_items = raw.get("product_items") or []
    if product_items:
        if current.role != UserRole.exportateur:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only exporters can attach catalog products to a shipment",
            )
        seen: set[int] = set()
        for it in product_items:
            pid = int(it["product_id"])
            if pid in seen:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Duplicate product_id in product_items",
                )
            seen.add(pid)
            p = db.get(Product, pid)
            if p is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {pid} not found")
            if p.user_id != current.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only attach your own catalog products",
                )

    ref = _generate_unique_reference(db)
    s = Shipment(
        owner_id=current.id,
        reference=ref,
        origin=raw["origin"],
        destination=raw["destination"],
        cargo_type=_parse_enum(CargoType, raw["cargo_type"], "cargo_type"),
        transport_mode=_parse_enum(TransportMode, raw["transport_mode"], "transport_mode"),
        status=_parse_enum(ShipmentStatus, raw["status"], "status"),
        weight_kg=raw.get("weight_kg"),
        volume_m3=raw.get("volume_m3"),
        estimated_value=raw.get("estimated_value"),
        currency=(raw.get("currency") or "USD").strip() or "USD",
        freight_estimate_usd=raw.get("freight_estimate_usd"),
        departure_date=raw.get("departure_date"),
        arrival_date=raw.get("arrival_date"),
        notes=raw.get("notes"),
    )
    db.add(s)
    db.flush()
    for it in product_items:
        db.add(
            ShipmentProduct(
                shipment_id=s.id,
                product_id=int(it["product_id"]),
                quantity=int(it["quantity"]),
            )
        )
    db.add(
        Notification(
            user_id=current.id,
            title="Shipment created",
            message=f"Your shipment {s.reference} has been created",
            notification_type=NotificationType.success,
            shipment_id=s.id,
        )
    )
    db.commit()
    db.refresh(s)
    _send_shipment_created_channels(current, s)
    return s


@router.get("", response_model=list[ShipmentResponse])
def list_shipments(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    status: str | None = Query(default=None, description="Filter by shipment status"),
    mine_only: bool = Query(
        default=False,
        description="If true, only shipments owned by the current user (applies to admins previewing importer views)",
    ),
) -> list[Shipment]:
    q = select(Shipment)

    if current.role == UserRole.transitaire:
        if status is not None:
            st = _parse_enum(ShipmentStatus, status, "status")
            q = q.where(Shipment.status == st)
        # else: all shipments (forwarder dashboard splits active vs completed)
    elif current.role == UserRole.courtier:
        if status is not None:
            st = _parse_enum(ShipmentStatus, status, "status")
            q = q.where(Shipment.status == st)
        # else: all shipments (read-only broker view)
    else:
        if not _is_admin(current):
            if current.role == UserRole.exportateur:
                q = q.where(
                    or_(Shipment.owner_id == current.id, Shipment.exporter_user_id == current.id)
                )
            else:
                q = q.where(Shipment.owner_id == current.id)
        elif mine_only:
            q = q.where(Shipment.owner_id == current.id)
        if status is not None:
            st = _parse_enum(ShipmentStatus, status, "status")
            q = q.where(Shipment.status == st)

    return list(db.scalars(q).all())


@router.get("/{shipment_id}", response_model=ShipmentDetailResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ShipmentDetailResponse:
    s = db.execute(
        select(Shipment)
        .options(joinedload(Shipment.documents), joinedload(Shipment.owner))
        .where(Shipment.id == shipment_id)
    ).unique().scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    if not _can_view_shipment(current, s):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this shipment",
        )

    assert s.owner is not None
    docs_sorted = sorted(s.documents or [], key=lambda d: d.uploaded_at, reverse=True)
    documents = [
        ShipmentDocumentBrief(
            id=d.id,
            filename=d.filename,
            original_name=d.original_name,
            file_type=d.file_type,
            is_verified=d.is_verified,
            ai_result=d.ai_result,
        )
        for d in docs_sorted
    ]
    owner = ShipmentOwnerBrief(full_name=s.owner.full_name, email=s.owner.email)
    notif_rows = db.scalars(
        select(Notification)
        .where(Notification.shipment_id == shipment_id)
        .order_by(Notification.created_at.desc())
        .limit(5)
    ).all()
    notifications = [
        ShipmentNotificationBrief(
            id=n.id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            created_at=n.created_at,
            is_read=n.is_read,
        )
        for n in notif_rows
    ]
    base = ShipmentResponse.model_validate(s).model_dump()
    return ShipmentDetailResponse(
        **base,
        documents=documents,
        owner=owner,
        notifications=notifications,
    )


@router.patch("/{shipment_id}/status", response_model=ShipmentResponse)
def update_shipment_status(
    shipment_id: int,
    payload: ShipmentStatusUpdateBody,
    db: Session = Depends(get_db),
    current: User = _status_updater,
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    new_st = _parse_enum(ShipmentStatus, payload.new_status, "new_status")
    cur = s.status

    if cur == ShipmentStatus.delivered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivered shipments cannot be updated",
        )

    allowed = _ALLOWED_STATUS_TRANSITIONS.get(cur, frozenset())
    if new_st not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from {cur.value} to {new_st.value}",
        )

    patch = payload.model_dump(exclude_unset=True)
    notes_for_message = (payload.notes or "").strip()
    if "notes" in patch:
        raw = patch["notes"]
        s.notes = None if raw is None else (raw.strip() or None)
    if "vessel_name" in patch:
        s.vessel_name = (patch["vessel_name"] or "").strip() or None
    if "voyage_number" in patch:
        s.voyage_number = (patch["voyage_number"] or "").strip() or None
    if "eta_update" in patch:
        s.eta_update = patch["eta_update"]

    s.status = new_st
    db.flush()

    msg = f"Status changed to {new_st.value}. {notes_for_message}".strip()

    db.add(
        Notification(
            user_id=s.owner_id,
            title=f"Shipment {s.reference} status updated",
            message=msg,
            notification_type=NotificationType.info,
            shipment_id=s.id,
        )
    )
    if s.exporter_user_id and s.exporter_user_id != s.owner_id:
        db.add(
            Notification(
                user_id=s.exporter_user_id,
                title=f"Shipment {s.reference} status updated",
                message=msg,
                notification_type=NotificationType.info,
                shipment_id=s.id,
            )
        )
    db.commit()
    db.refresh(s)

    owner = db.get(User, s.owner_id)
    if owner and owner.email:
        subject = f"Shipment {s.reference} status updated"
        try:
            EmailService().send(owner.email, subject, msg)
        except Exception:
            pass

    if new_st in (ShipmentStatus.in_transit, ShipmentStatus.delivered, ShipmentStatus.delayed):
        phone = (owner.phone or "").strip() if owner else ""
        if phone:
            try:
                SMSService().send(phone, msg)
            except Exception:
                pass

    return s


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if not _can_mutate_shipment(current, s):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    assert s is not None
    _apply_shipment_update(s, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    s = db.get(Shipment, shipment_id)
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    if not _is_admin(current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete shipments",
        )
    assert s is not None
    db.delete(s)
    db.commit()
