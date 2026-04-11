from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.notification import Notification, NotificationType
from models.shipment import CargoType, Shipment, ShipmentStatus, TransportMode
from models.user import User, UserRole
from schemas.shipment import ShipmentCreate, ShipmentResponse, ShipmentUpdate

router = APIRouter()

_shipment_creator = Depends(require_role(["importateur", "admin"]))
_status_updater = Depends(require_role(["transitaire", "admin"]))


class ShipmentStatusUpdateBody(BaseModel):
    new_status: str
    notes: str | None = None


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
    ShipmentStatus.delayed: frozenset({ShipmentStatus.in_transit}),
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


def _can_access_shipment(current: User, s: Shipment | None) -> bool:
    if s is None:
        return False
    if _is_admin(current):
        return True
    return s.owner_id == current.id


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current: User = _shipment_creator,
) -> Shipment:
    raw = payload.model_dump()
    # owner_id is never taken from the client; always the authenticated user
    s = Shipment(
        owner_id=current.id,
        reference=raw["reference"],
        origin=raw["origin"],
        destination=raw["destination"],
        cargo_type=_parse_enum(CargoType, raw["cargo_type"], "cargo_type"),
        transport_mode=_parse_enum(TransportMode, raw["transport_mode"], "transport_mode"),
        status=_parse_enum(ShipmentStatus, raw["status"], "status"),
        weight_kg=raw.get("weight_kg"),
        volume_m3=raw.get("volume_m3"),
        estimated_value=raw.get("estimated_value"),
        departure_date=raw.get("departure_date"),
        arrival_date=raw.get("arrival_date"),
        notes=raw.get("notes"),
    )
    db.add(s)
    db.flush()
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
        else:
            q = q.where(Shipment.status != ShipmentStatus.delivered)
    elif current.role == UserRole.courtier:
        if status is not None:
            st = _parse_enum(ShipmentStatus, status, "status")
            q = q.where(Shipment.status == st)
        # else: all shipments (read-only broker view)
    else:
        if not _is_admin(current):
            q = q.where(Shipment.owner_id == current.id)
        elif mine_only:
            q = q.where(Shipment.owner_id == current.id)
        if status is not None:
            st = _parse_enum(ShipmentStatus, status, "status")
            q = q.where(Shipment.status == st)

    return list(db.scalars(q).all())


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    if (
        current.role in (UserRole.transitaire, UserRole.courtier)
        or _is_admin(current)
        or current.id == s.owner_id
    ):
        return s
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to view this shipment",
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
            detail="Cannot change status from delivered",
        )

    allowed = _ALLOWED_STATUS_TRANSITIONS.get(cur, frozenset())
    if new_st not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from {cur.value} to {new_st.value}",
        )

    s.status = new_st
    db.flush()

    notes = (payload.notes or "").strip()
    msg = f"Status changed to {new_st.value}."
    if notes:
        msg = f"{msg} {notes}"

    db.add(
        Notification(
            user_id=s.owner_id,
            title=f"Shipment {s.reference} status updated",
            message=msg,
            notification_type=NotificationType.info,
            shipment_id=s.id,
        )
    )
    db.commit()
    db.refresh(s)
    return s


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if not _can_access_shipment(current, s):
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
    if not _can_access_shipment(current, s):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    assert s is not None
    db.delete(s)
    db.commit()
