"""
Simulated GPS movement along a route (linear interpolation + noise + speed variation).

Designed to be swappable with real GPS ingestion later: same inputs (origin/dest, progress)
produce lat/lng updates; replace this module's step logic with device-reported coordinates.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Literal

TrackingStatus = Literal["pending", "dispatched", "in_transit", "out_for_delivery", "delivered"]

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters."""
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return EARTH_RADIUS_M * c


def interpolate_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    progress: float,
) -> tuple[float, float]:
    """Linear interpolation (adequate for regional demo routes). `progress` in [0, 1]."""
    t = max(0.0, min(1.0, progress))
    lat = origin_lat + (dest_lat - origin_lat) * t
    lng = origin_lng + (dest_lng - origin_lng) * t
    return lat, lng


def gps_noise_deg() -> tuple[float, float]:
    """Small random drift (~10–40 m typical)."""
    return random.gauss(0, 0.00012), random.gauss(0, 0.00012)


def status_for_progress(progress: float, started: bool) -> TrackingStatus:
    """Map normalized progress to logistics-style tracking status."""
    if not started:
        return "pending"
    p = max(0.0, min(1.0, progress))
    if p >= 0.999:
        return "delivered"
    if p >= 0.82:
        return "out_for_delivery"
    if p >= 0.18:
        return "in_transit"
    return "dispatched"


def next_progress(
    current: float,
    *,
    slowdown_near_dest: bool = True,
) -> float:
    """Advance progress by one tick with variable speed and optional slowdown near destination."""
    base = 0.006 + random.uniform(0, 0.005)
    speed = random.uniform(0.75, 1.35)
    delta = base * speed
    if slowdown_near_dest and current > 0.78:
        factor = 1.0 - ((current - 0.78) / 0.22) * 0.65
        delta *= max(0.12, factor)
    return min(1.0, current + delta)


@dataclass(frozen=True)
class DemoRoute:
    label: str
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


# Realistic city pairs for demo seeding (Mediterranean / Europe trade lanes)
DEMO_ROUTES: list[DemoRoute] = [
    DemoRoute("Tunis → Marseille", 36.8065, 10.1815, 43.2965, 5.3698),
    DemoRoute("Alger → Paris", 36.7538, 3.0588, 48.8566, 2.3522),
    DemoRoute("Istanbul → Marseille", 41.0082, 28.9784, 43.2965, 5.3698),
]
