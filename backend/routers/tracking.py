"""Simulated GPS shipment tracking (REST + polling). Register before generic `/{id}` shipment routes."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db, SessionLocal
from models.shipment import CargoType, Shipment, ShipmentStatus, TransportMode
from models.user import User, UserRole
from routers.shipments import _generate_unique_reference
from services import gps_simulation as gps
from services.tracking_manager import apply_main_status_for_tracking, get_tracking_manager

router = APIRouter()
demo_router = APIRouter()


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


def _can_control_tracking(current: User, s: Shipment | None) -> bool:
    """Start / pause / reset / init (demo controls)."""
    if s is None:
        return False
    if _is_admin(current):
        return True
    if current.role == UserRole.transitaire:
        return True
    if s.owner_id == current.id:
        return True
    if current.role == UserRole.exportateur and s.exporter_user_id == current.id:
        return True
    return False


def _shipment_scope_query(current: User):
    q = select(Shipment).where(Shipment.origin_lat.isnot(None))
    if _is_admin(current) or current.role in (UserRole.transitaire, UserRole.courtier):
        return q
    if current.role == UserRole.exportateur:
        return q.where(or_(Shipment.owner_id == current.id, Shipment.exporter_user_id == current.id))
    return q.where(Shipment.owner_id == current.id)


class TrackingInitBody(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lng: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lng: float = Field(..., ge=-180, le=180)
    estimated_delivery_hours: float = Field(default=48, ge=1, le=14 * 24)


class TrackingStateResponse(BaseModel):
    shipment_id: int
    reference: str
    origin_lat: float | None
    origin_lng: float | None
    dest_lat: float | None
    dest_lng: float | None
    current_lat: float | None
    current_lng: float | None
    tracking_status: str
    tracking_progress: float
    location_history: list[dict]
    estimated_delivery_at: datetime | None
    simulation_state: str

    model_config = {"from_attributes": False}


class SeedDemosResponse(BaseModel):
    created: list[int]
    message: str


def _state_from_shipment(sh: Shipment) -> TrackingStateResponse:
    return TrackingStateResponse(
        shipment_id=sh.id,
        reference=sh.reference,
        origin_lat=sh.origin_lat,
        origin_lng=sh.origin_lng,
        dest_lat=sh.dest_lat,
        dest_lng=sh.dest_lng,
        current_lat=sh.current_lat,
        current_lng=sh.current_lng,
        tracking_status=sh.tracking_status or "pending",
        tracking_progress=float(sh.tracking_progress or 0.0),
        location_history=list(sh.location_history or []),
        estimated_delivery_at=sh.estimated_delivery_at,
        simulation_state=sh.simulation_state or "idle",
    )


@router.get("/tracking/active", response_model=list[TrackingStateResponse])
def list_trackable_shipments(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[TrackingStateResponse]:
    rows = db.scalars(_shipment_scope_query(current).order_by(Shipment.updated_at.desc()).limit(100)).all()
    return [_state_from_shipment(s) for s in rows]


@router.get("/{shipment_id}/tracking", response_model=TrackingStateResponse)
def get_tracking_state(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TrackingStateResponse:
    sh = db.get(Shipment, shipment_id)
    if not _can_view_shipment(current, sh):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    assert sh is not None
    return _state_from_shipment(sh)


@router.post("/{shipment_id}/tracking/init", response_model=TrackingStateResponse)
def init_tracking(
    shipment_id: int,
    payload: TrackingInitBody,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TrackingStateResponse:
    sh = db.get(Shipment, shipment_id)
    if not _can_control_tracking(current, sh):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    assert sh is not None
    if (sh.simulation_state or "") == "running":
        raise HTTPException(status_code=400, detail="Pause the simulation before re-initializing")

    now = datetime.now(timezone.utc)
    eta = now + timedelta(hours=payload.estimated_delivery_hours)
    olat, olng = payload.origin_lat, payload.origin_lng
    sh.origin_lat = olat
    sh.origin_lng = olng
    sh.dest_lat = payload.dest_lat
    sh.dest_lng = payload.dest_lng
    sh.current_lat = olat
    sh.current_lng = olng
    sh.tracking_status = "pending"
    sh.tracking_progress = 0.0
    sh.estimated_delivery_at = eta
    sh.simulation_state = "idle"
    sh.location_history = [
        {"lat": round(olat, 6), "lng": round(olng, 6), "ts": now.isoformat()},
    ]
    db.commit()
    db.refresh(sh)
    return _state_from_shipment(sh)


@router.post("/{shipment_id}/tracking/start", response_model=TrackingStateResponse)
async def start_tracking(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TrackingStateResponse:
    sh = db.get(Shipment, shipment_id)
    if not _can_control_tracking(current, sh):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    assert sh is not None
    if sh.origin_lat is None or sh.dest_lat is None:
        raise HTTPException(status_code=400, detail="Initialize tracking coordinates first (POST .../init)")

    sh.simulation_state = "running"
    sh.tracking_status = "dispatched"
    sh.tracking_progress = max(float(sh.tracking_progress or 0), 0.02)
    apply_main_status_for_tracking(sh, "dispatched")
    db.commit()
    db.refresh(sh)

    await get_tracking_manager().start(shipment_id)
    return _state_from_shipment(sh)


def _set_paused_sync(shipment_id: int) -> None:
    with SessionLocal() as sdb:
        row = sdb.get(Shipment, shipment_id)
        if row:
            row.simulation_state = "paused"
            sdb.commit()


@router.post("/{shipment_id}/tracking/pause", response_model=TrackingStateResponse)
async def pause_tracking(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TrackingStateResponse:
    sh = db.get(Shipment, shipment_id)
    if not _can_control_tracking(current, sh):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    assert sh is not None

    await asyncio.to_thread(_set_paused_sync, shipment_id)
    await get_tracking_manager().stop_task(shipment_id)

    sh = db.get(Shipment, shipment_id)
    assert sh is not None
    return _state_from_shipment(sh)


@router.post("/{shipment_id}/tracking/reset", response_model=TrackingStateResponse)
async def reset_tracking(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TrackingStateResponse:
    sh = db.get(Shipment, shipment_id)
    if not _can_control_tracking(current, sh):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    assert sh is not None

    await get_tracking_manager().stop_task(shipment_id)

    olat, olng, dlat, dlng = sh.origin_lat, sh.origin_lng, sh.dest_lat, sh.dest_lng
    now = datetime.now(timezone.utc)
    sh.simulation_state = "idle"
    sh.tracking_status = "pending"
    sh.tracking_progress = 0.0
    if olat is not None and olng is not None:
        sh.current_lat = float(olat)
        sh.current_lng = float(olng)
    else:
        sh.current_lat = None
        sh.current_lng = None
    sh.location_history = (
        [{"lat": round(float(olat), 6), "lng": round(float(olng), 6), "ts": now.isoformat()}]
        if olat is not None and olng is not None
        else []
    )
    if sh.status == ShipmentStatus.delivered:
        sh.status = ShipmentStatus.pending
    db.commit()
    db.refresh(sh)
    return _state_from_shipment(sh)


@demo_router.get("/tracking/demo-routes")
def demo_routes(_: User = Depends(get_current_user)) -> list[dict]:
    """Preset coordinates for demo / seed (no auth for easy discovery in dev; harmless)."""
    return [
        {
            "label": r.label,
            "origin_lat": r.origin_lat,
            "origin_lng": r.origin_lng,
            "dest_lat": r.dest_lat,
            "dest_lng": r.dest_lng,
        }
        for r in gps.DEMO_ROUTES
    ]


@demo_router.post("/tracking/seed-demos", response_model=SeedDemosResponse)
def seed_demo_shipments(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> SeedDemosResponse:
    if current.role not in (UserRole.admin, UserRole.importateur, UserRole.exportateur):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed for this role")

    created: list[int] = []
    now = datetime.now(timezone.utc)
    for route in gps.DEMO_ROUTES:
        ref = _generate_unique_reference(db)
        parts = [p.strip() for p in route.label.split("→")]
        o_name = parts[0] if parts else route.label
        d_name = parts[1] if len(parts) > 1 else o_name
        s = Shipment(
            owner_id=current.id,
            reference=ref,
            origin=o_name,
            destination=d_name,
            cargo_type=CargoType.general,
            transport_mode=TransportMode.sea,
            status=ShipmentStatus.pending,
            origin_lat=route.origin_lat,
            origin_lng=route.origin_lng,
            dest_lat=route.dest_lat,
            dest_lng=route.dest_lng,
            current_lat=route.origin_lat,
            current_lng=route.origin_lng,
            tracking_status="pending",
            tracking_progress=0.0,
            estimated_delivery_at=now + timedelta(hours=72),
            simulation_state="idle",
            location_history=[
                {
                    "lat": round(route.origin_lat, 6),
                    "lng": round(route.origin_lng, 6),
                    "ts": now.isoformat(),
                }
            ],
        )
        db.add(s)
        db.flush()
        created.append(s.id)
    db.commit()
    return SeedDemosResponse(
        created=created,
        message=f"Created {len(created)} demo shipments with GPS routes. Open Live tracking map to start simulation.",
    )
