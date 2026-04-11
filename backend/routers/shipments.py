from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user
from models.shipment import CargoType, Shipment, ShipmentStatus, TransportMode
from models.user import User
from schemas.shipment import ShipmentCreate, ShipmentResponse, ShipmentUpdate

router = APIRouter()


class ShipmentStatusBody(BaseModel):
    status: str


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


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    raw = payload.model_dump()
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
    db.commit()
    db.refresh(s)
    return s


@router.get("", response_model=list[ShipmentResponse])
def list_shipments(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Shipment]:
    return list(db.scalars(select(Shipment).where(Shipment.owner_id == current.id)).all())


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if not s or s.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return s


@router.patch("/{shipment_id}/status", response_model=ShipmentResponse)
def update_shipment_status(
    shipment_id: int,
    payload: ShipmentStatusBody,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if not s or s.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    s.status = _parse_enum(ShipmentStatus, payload.status, "status")
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
    if not s or s.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
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
    if not s or s.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    db.delete(s)
    db.commit()
