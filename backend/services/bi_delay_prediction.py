"""
Business Intelligence — predictive delay risk for shipments.

Combines historical operational data (lanes, forwarders / transitaires, cargo, customs)
with a transparent scoring model. Optional Gemini narrative for executive summaries.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import mean, median
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from models.shipment import Shipment, ShipmentStatus
from models.user import User, UserRole

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = frozenset(
    {
        ShipmentStatus.pending,
        ShipmentStatus.in_transit,
        ShipmentStatus.customs_hold,
        ShipmentStatus.delayed,
    }
)

DELAYED_STATUSES = frozenset({ShipmentStatus.delayed, ShipmentStatus.customs_hold})


def _status_value(status: ShipmentStatus | str) -> str:
    return status.value if hasattr(status, "value") else str(status)


def _lane_key(origin: str, destination: str, transport_mode: str) -> str:
    def norm(s: str) -> str:
        s = (s or "").strip().lower()
        s = re.sub(r"[^a-z0-9]+", "_", s)
        return s[:40] or "unknown"

    return f"{norm(origin)}__{norm(destination)}__{transport_mode or 'sea'}"


def _transit_days(sh: Shipment) -> float | None:
    if sh.departure_date and sh.arrival_date:
        return max(0.0, float((sh.arrival_date - sh.departure_date).days))
    if sh.created_at and sh.updated_at and _status_value(sh.status) == "delivered":
        return max(0.0, (sh.updated_at - sh.created_at).total_seconds() / 86400.0)
    return None


def _was_delayed(sh: Shipment) -> bool:
    if _status_value(sh.status) in ("delayed",):
        return True
    if _status_value(sh.status) == "customs_hold":
        return True
    days = _transit_days(sh)
    if days is not None and days > 21 and _status_value(sh.status) != "delivered":
        return True
    if days is not None and days > 28:
        return True
    return False


def _smooth_rate(successes: int, total: int, prior: float = 0.12, strength: float = 8.0) -> float:
    """Beta-smoothed delay probability for small samples."""
    return (successes + prior * strength) / (total + strength)


@dataclass
class _HistoryRow:
    shipment: Shipment
    delayed: bool
    transit_days: float | None
    lane: str
    forwarder_id: int | None


class DelayPredictionEngine:
    """Explainable BI engine — no black-box ML dependency."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self._forwarders: dict[int, User] = {}
        self._default_forwarder_id: int | None = None

    def _load_forwarders(self) -> None:
        rows = list(
            self.db.scalars(
                select(User).where(User.role == UserRole.transitaire, User.is_active.is_(True))
            ).all()
        )
        self._forwarders = {u.id: u for u in rows}
        if len(rows) == 1:
            self._default_forwarder_id = rows[0].id

    def _resolve_forwarder_id(self, sh: Shipment) -> int | None:
        fid = getattr(sh, "forwarder_user_id", None)
        if fid:
            return int(fid)
        return self._default_forwarder_id

    def _build_history(self, shipments: list[Shipment]) -> list[_HistoryRow]:
        completed = [
            s
            for s in shipments
            if _status_value(s.status) in ("delivered", "delayed", "cancelled", "customs_hold")
        ]
        rows: list[_HistoryRow] = []
        for sh in completed:
            rows.append(
                _HistoryRow(
                    shipment=sh,
                    delayed=_was_delayed(sh),
                    transit_days=_transit_days(sh),
                    lane=_lane_key(sh.origin, sh.destination, _status_value(sh.transport_mode)),
                    forwarder_id=self._resolve_forwarder_id(sh),
                )
            )
        return rows

    def _aggregate_forwarders(self, history: list[_HistoryRow]) -> list[dict[str, Any]]:
        buckets: dict[int, list[_HistoryRow]] = {}
        for row in history:
            if row.forwarder_id is None:
                continue
            buckets.setdefault(row.forwarder_id, []).append(row)

        out: list[dict[str, Any]] = []
        for fid, rows in buckets.items():
            user = self._forwarders.get(fid)
            if not user:
                continue
            total = len(rows)
            delays = sum(1 for r in rows if r.delayed)
            rate = _smooth_rate(delays, total)
            transits = [r.transit_days for r in rows if r.transit_days is not None]
            avg_transit = round(mean(transits), 1) if transits else None
            med_transit = round(median(transits), 1) if transits else None
            on_time = max(0, total - delays)
            score = round(max(0.0, min(100.0, (1.0 - rate) * 100)), 1)
            out.append(
                {
                    "forwarder_id": fid,
                    "forwarder_name": user.full_name,
                    "forwarder_email": user.email,
                    "shipments_handled": total,
                    "delay_count": delays,
                    "on_time_count": on_time,
                    "delay_rate_percent": round(rate * 100, 1),
                    "reliability_score": score,
                    "avg_transit_days": avg_transit,
                    "median_transit_days": med_transit,
                    "grade": (
                        "A" if score >= 90 else "B" if score >= 78 else "C" if score >= 65 else "D"
                    ),
                }
            )
        out.sort(key=lambda x: (-x["reliability_score"], -x["shipments_handled"]))
        return out

    def _aggregate_lanes(self, history: list[_HistoryRow]) -> list[dict[str, Any]]:
        buckets: dict[str, list[_HistoryRow]] = {}
        for row in history:
            buckets.setdefault(row.lane, []).append(row)

        out: list[dict[str, Any]] = []
        for lane, rows in buckets.items():
            total = len(rows)
            if total < 1:
                continue
            delays = sum(1 for r in rows if r.delayed)
            rate = _smooth_rate(delays, total)
            sample = rows[0].shipment
            out.append(
                {
                    "lane_key": lane,
                    "origin": sample.origin,
                    "destination": sample.destination,
                    "transport_mode": _status_value(sample.transport_mode),
                    "sample_size": total,
                    "delay_rate_percent": round(rate * 100, 1),
                    "risk_level": "high" if rate >= 0.35 else "medium" if rate >= 0.18 else "low",
                }
            )
        out.sort(key=lambda x: -x["delay_rate_percent"])
        return out[:12]

    def _predict_shipment(
        self,
        sh: Shipment,
        lane_rates: dict[str, float],
        forwarder_rates: dict[int, float],
        global_rate: float,
        avg_transit_global: float,
    ) -> dict[str, Any]:
        lane = _lane_key(sh.origin, sh.destination, _status_value(sh.transport_mode))
        fid = self._resolve_forwarder_id(sh)

        lane_r = lane_rates.get(lane, global_rate)
        fwd_r = forwarder_rates.get(fid, global_rate) if fid else global_rate

        cargo = _status_value(sh.cargo_type)
        cargo_boost = {"perishable": 0.08, "dangerous": 0.12, "fragile": 0.05}.get(cargo, 0.0)
        status_boost = {
            "delayed": 0.35,
            "customs_hold": 0.22,
            "in_transit": 0.05,
            "pending": 0.03,
        }.get(_status_value(sh.status), 0.0)

        progress = float(sh.tracking_progress or 0.0)
        progress_lag = 0.0
        if _status_value(sh.status) == "in_transit" and progress < 0.25:
            progress_lag = 0.08
        if _status_value(sh.status) == "in_transit" and progress > 0.85:
            progress_lag = -0.05

        unverified_docs_boost = 0.0
        docs = list(sh.documents or [])
        if docs:
            pending = sum(1 for d in docs if not d.is_verified)
            unverified_docs_boost = min(0.15, pending * 0.04)

        probability = min(
            0.98,
            max(
                0.02,
                lane_r * 0.38 + fwd_r * 0.34 + global_rate * 0.08 + cargo_boost + status_boost + progress_lag + unverified_docs_boost,
            ),
        )

        expected_transit = avg_transit_global
        if fid and fid in forwarder_rates:
            expected_transit *= 1.0 + (fwd_r - global_rate) * 0.5
        expected_transit += lane_r * 4.0

        elapsed = 0.0
        if sh.created_at:
            elapsed = max(0.0, (datetime.now(timezone.utc) - sh.created_at).total_seconds() / 86400.0)

        predicted_extra_days = max(0.0, round(expected_transit - elapsed + probability * 5, 1))
        risk_band = "critical" if probability >= 0.72 else "high" if probability >= 0.48 else "moderate" if probability >= 0.28 else "low"

        forwarder = self._forwarders.get(fid) if fid else None
        factors: list[str] = []
        if lane_r >= 0.25:
            factors.append(f"Corridor {sh.origin} → {sh.destination} : historique de retards élevé")
        if fwd_r >= 0.22 and forwarder:
            factors.append(f"Transitaire {forwarder.full_name} : taux de retard historique {round(fwd_r * 100)} %")
        if _status_value(sh.status) == "customs_hold":
            factors.append("Statut actuel : blocage douane")
        if unverified_docs_boost > 0:
            factors.append("Documents non vérifiés sur l'expédition")
        if not factors:
            factors.append("Profil de risque aligné sur la moyenne réseau")

        return {
            "shipment_id": sh.id,
            "reference": sh.reference,
            "origin": sh.origin,
            "destination": sh.destination,
            "status": _status_value(sh.status),
            "transport_mode": _status_value(sh.transport_mode),
            "forwarder_id": fid,
            "forwarder_name": forwarder.full_name if forwarder else None,
            "delay_probability_percent": round(probability * 100, 1),
            "risk_band": risk_band,
            "predicted_additional_delay_days": predicted_extra_days,
            "confidence_percent": round(min(95.0, 45.0 + len(lane_rates) * 3 + (12 if fid else 0)), 1),
            "risk_factors": factors,
        }

    def build_report(self, shipments: list[Shipment]) -> dict[str, Any]:
        self._load_forwarders()
        history = self._build_history(shipments)
        global_delays = sum(1 for r in history if r.delayed)
        global_total = max(len(history), 1)
        global_rate = _smooth_rate(global_delays, global_total)

        transits = [r.transit_days for r in history if r.transit_days is not None]
        avg_transit_global = mean(transits) if transits else 14.0

        forwarder_stats = self._aggregate_forwarders(history)
        forwarder_rates = {
            int(f["forwarder_id"]): float(f["delay_rate_percent"]) / 100.0 for f in forwarder_stats
        }

        lane_stats = self._aggregate_lanes(history)
        lane_rates = {l["lane_key"]: float(l["delay_rate_percent"]) / 100.0 for l in lane_stats}

        active = [s for s in shipments if _status_value(s.status) in {x.value for x in ACTIVE_STATUSES}]
        predictions = [
            self._predict_shipment(s, lane_rates, forwarder_rates, global_rate, avg_transit_global)
            for s in active
        ]
        predictions.sort(key=lambda p: -p["delay_probability_percent"])

        at_risk = [p for p in predictions if p["delay_probability_percent"] >= 40.0]
        high_risk = [p for p in predictions if p["risk_band"] in ("critical", "high")]

        monthly_trend: list[dict[str, Any]] = []
        now = datetime.now(timezone.utc)
        for delta in range(-5, 1):
            y = now.year
            m = now.month + delta
            while m < 1:
                m += 12
                y -= 1
            while m > 12:
                m -= 12
                y += 1
            label = f"{y}-{m:02d}"
            month_rows = [
                r
                for r in history
                if r.shipment.created_at
                and r.shipment.created_at.year == y
                and r.shipment.created_at.month == m
            ]
            if not month_rows:
                monthly_trend.append({"month": label, "delay_rate_percent": round(global_rate * 100, 1), "count": 0})
                continue
            d = sum(1 for r in month_rows if r.delayed)
            monthly_trend.append(
                {
                    "month": label,
                    "delay_rate_percent": round((d / len(month_rows)) * 100, 1),
                    "count": len(month_rows),
                }
            )

        return {
            "generated_at": now.isoformat(),
            "methodology": {
                "model": "GlobalTradeX BI — smoothed historical rates + multi-factor risk score",
                "factors": [
                    "Corridor logistique (origine / destination / mode)",
                    "Performance historique du transitaire assigné",
                    "Type de marchandise et statut opérationnel",
                    "Progression GPS et conformité documentaire",
                ],
                "training_samples": len(history),
                "global_delay_rate_percent": round(global_rate * 100, 1),
                "avg_transit_days_baseline": round(avg_transit_global, 1),
            },
            "summary": {
                "active_shipments": len(active),
                "at_risk_count": len(at_risk),
                "high_risk_count": len(high_risk),
                "avg_delay_probability_percent": round(
                    mean([p["delay_probability_percent"] for p in predictions]) if predictions else 0.0,
                    1,
                ),
                "forwarders_analyzed": len(forwarder_stats),
            },
            "forwarder_performance": forwarder_stats,
            "lane_risk": lane_stats,
            "delay_trend_by_month": monthly_trend,
            "predictions": predictions[:25],
            "at_risk_shipments": at_risk[:15],
        }


def generate_ai_executive_summary(report: dict[str, Any]) -> dict[str, Any]:
    """Optional OpenAI narrative — falls back to rule-based summary."""
    from services.openai_service import OpenAIService

    fallback = _rule_based_summary(report)
    svc = OpenAIService()
    payload = {
        "summary": report.get("summary"),
        "methodology": report.get("methodology"),
        "top_risks": (report.get("at_risk_shipments") or [])[:5],
        "forwarders": (report.get("forwarder_performance") or [])[:5],
        "lanes": (report.get("lane_risk") or [])[:5],
    }
    system = (
        "You are a senior supply-chain BI analyst for GlobalTradeX, a international trade platform. "
        "Write a concise executive summary in French (3 short paragraphs + 3 bullet recommendations). "
        "Focus on predictive delay risk, forwarder (transitaire) performance, and actionable mitigation. "
        "Do not invent numbers — only use those provided in the JSON."
    )
    user = f"BI predictive report JSON:\n{json.dumps(payload, ensure_ascii=False)[:12000]}"
    result = svc.chat(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
    )
    text = (result.get("reply") or "").strip()
    if not text or result.get("error"):
        return {"summary_text": fallback, "provider": "rules", "ai_enhanced": False}
    return {"summary_text": text, "provider": "gemini", "ai_enhanced": True}


def _rule_based_summary(report: dict[str, Any]) -> str:
    s = report.get("summary") or {}
    m = report.get("methodology") or {}
    lines = [
        f"Analyse prédictive BI sur {m.get('training_samples', 0)} expéditions historiques.",
        f"Taux global de retard observé : {m.get('global_delay_rate_percent', 0)} %. "
        f"{s.get('at_risk_count', 0)} expédition(s) active(s) présentent un risque de retard ≥ 40 %.",
    ]
    fwd = report.get("forwarder_performance") or []
    if fwd:
        best = fwd[0]
        lines.append(
            f"Meilleur transitaire : {best.get('forwarder_name')} (score fiabilité {best.get('reliability_score')})."
        )
    risks = report.get("at_risk_shipments") or []
    if risks:
        top = risks[0]
        lines.append(
            f"Priorité : {top.get('reference')} ({top.get('origin')} → {top.get('destination')}) — "
            f"probabilité de retard {top.get('delay_probability_percent')} %."
        )
    return " ".join(lines)
