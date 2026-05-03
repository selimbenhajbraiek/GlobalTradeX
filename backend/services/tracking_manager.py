"""
In-process asyncio simulation loop per shipment. Persists state to DB each tick.

On server restart, `resume_from_db()` restarts tasks for rows with simulation_state='running'.
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from models.shipment import Shipment, ShipmentStatus
from services import gps_simulation as gps

logger = logging.getLogger(__name__)

_MAX_HISTORY = 400
_TICK_MIN = 2.0
_TICK_MAX = 4.2

# In-memory stop counters (not persisted; resets on restart — acceptable for demo)
_stop_ticks: dict[int, int] = {}


def _append_history(session: Session, shipment: Shipment, lat: float, lng: float) -> None:
    hist = list(shipment.location_history or [])
    hist.append(
        {
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )
    if len(hist) > _MAX_HISTORY:
        hist = hist[-_MAX_HISTORY:]
    shipment.location_history = hist


def apply_main_status_for_tracking(shipment: Shipment, tracking_status: str) -> None:
    """Keep legacy `status` loosely aligned for the rest of the app."""
    if tracking_status in ("in_transit", "out_for_delivery", "dispatched"):
        if shipment.status not in (ShipmentStatus.delivered, ShipmentStatus.cancelled):
            shipment.status = ShipmentStatus.in_transit
    if tracking_status == "delivered":
        shipment.status = ShipmentStatus.delivered


def _tick_shipment(shipment_id: int) -> str | None:
    """
    Perform one simulation step. Returns None if loop should continue,
    or a string reason if the loop should stop ('paused', 'idle', 'done', 'missing').
    """
    with SessionLocal() as db:
        sh = db.get(Shipment, shipment_id)
        if sh is None:
            return "missing"
        if sh.simulation_state != "running":
            return sh.simulation_state or "idle"

        if (
            sh.origin_lat is None
            or sh.origin_lng is None
            or sh.dest_lat is None
            or sh.dest_lng is None
        ):
            sh.simulation_state = "idle"
            db.commit()
            return "missing_coords"

        progress = float(sh.tracking_progress or 0.0)

        # occasional full stop (simulate traffic / hub dwell)
        st = _stop_ticks.get(shipment_id, 0)
        if st > 0:
            _stop_ticks[shipment_id] = st - 1
            db.commit()
            return None

        if random.random() < 0.04:
            _stop_ticks[shipment_id] = random.randint(1, 3)

        progress = gps.next_progress(progress)
        lat, lng = gps.interpolate_route(
            float(sh.origin_lat),
            float(sh.origin_lng),
            float(sh.dest_lat),
            float(sh.dest_lng),
            progress,
        )
        nlat, nlng = gps.gps_noise_deg()
        lat += nlat
        lng += nlng

        dist = gps.haversine_m(lat, lng, float(sh.dest_lat), float(sh.dest_lng))
        if dist < 180.0 or progress >= 0.999:
            progress = 1.0
            lat, lng = float(sh.dest_lat), float(sh.dest_lng)
            sh.tracking_progress = 1.0
            sh.current_lat = lat
            sh.current_lng = lng
            sh.tracking_status = "delivered"
            sh.simulation_state = "idle"
            _append_history(db, sh, lat, lng)
            apply_main_status_for_tracking(sh, "delivered")
            db.commit()
            return "done"

        sh.tracking_progress = progress
        sh.current_lat = lat
        sh.current_lng = lng
        ts = gps.status_for_progress(progress, started=True)
        sh.tracking_status = ts
        apply_main_status_for_tracking(sh, ts)
        _append_history(db, sh, lat, lng)
        db.commit()
        return None


async def _run_loop(shipment_id: int) -> None:
    try:
        while True:
            await asyncio.sleep(random.uniform(_TICK_MIN, _TICK_MAX))
            reason = await asyncio.to_thread(_tick_shipment, shipment_id)
            if reason is not None:
                break
    except asyncio.CancelledError:
        logger.debug("tracking loop cancelled shipment_id=%s", shipment_id)
    finally:
        get_tracking_manager().unregister_task(shipment_id)


class TrackingManager:
    def __init__(self) -> None:
        self._tasks: dict[int, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def shutdown(self) -> None:
        async with self._lock:
            for t in list(self._tasks.values()):
                t.cancel()
            self._tasks.clear()
        _stop_ticks.clear()

    async def resume_from_db(self) -> None:
        def _ids() -> list[int]:
            with SessionLocal() as db:
                return list(
                    db.scalars(select(Shipment.id).where(Shipment.simulation_state == "running")).all()
                )

        ids = await asyncio.to_thread(_ids)
        for sid in ids:
            await self.start(sid, force=True)

    async def start(self, shipment_id: int, *, force: bool = False) -> None:
        async with self._lock:
            if shipment_id in self._tasks and not force:
                return
            if shipment_id in self._tasks:
                self._tasks[shipment_id].cancel()
                try:
                    await self._tasks[shipment_id]
                except asyncio.CancelledError:
                    pass
            self._tasks[shipment_id] = asyncio.create_task(
                _run_loop(shipment_id),
                name=f"tracking-{shipment_id}",
            )

    async def stop_task(self, shipment_id: int) -> None:
        async with self._lock:
            t = self._tasks.pop(shipment_id, None)
        if t:
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass

    def unregister_task(self, shipment_id: int) -> None:
        """Clear completed/cancelled asyncio task handle (called from loop finally)."""
        self._tasks.pop(shipment_id, None)


_manager: TrackingManager | None = None


def get_tracking_manager() -> TrackingManager:
    global _manager
    if _manager is None:
        _manager = TrackingManager()
    return _manager
