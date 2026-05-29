from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.document import Document
from models.product import Product
from models.shipment import Shipment, ShipmentStatus
from models.user import User, UserRole
from services.bi_delay_prediction import DelayPredictionEngine, generate_ai_executive_summary

router = APIRouter()

_admin_only = Depends(require_role(["admin"]))
_bi_roles = Depends(require_role(["admin", "transitaire", "importateur", "exportateur"]))


def _month_start_utc(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    m = month + delta
    y = year
    while m > 12:
        m -= 12
        y += 1
    while m < 1:
        m += 12
        y -= 1
    return y, m


def _next_month_start(dt: datetime) -> datetime:
    return _month_start_utc(*_add_months(dt.year, dt.month, 1))


def _mom_percent(current: int, previous: int) -> float:
    if previous == 0:
        return round(100.0, 1) if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    ship_count = db.scalar(
        select(func.count()).select_from(Shipment).where(Shipment.owner_id == current.id)
    ) or 0
    doc_count = db.scalar(
        select(func.count()).select_from(Document).where(Document.uploaded_by == current.id)
    ) or 0
    return {
        "user_id": current.id,
        "shipments": ship_count,
        "documents": doc_count,
    }


@router.get("/global")
def analytics_global(
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> dict:
    """Platform-wide KPIs (admin only)."""
    now_utc = datetime.now(timezone.utc)

    total_users = db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0

    role_rows = db.execute(
        select(User.role, func.count()).where(User.is_active.is_(True)).group_by(User.role)
    ).all()
    users_by_role: dict[str, int] = {r.value: 0 for r in UserRole}
    for row in role_rows:
        key = row[0].value if hasattr(row[0], "value") else str(row[0])
        users_by_role[key] = int(row[1])

    total_shipments = db.scalar(select(func.count()).select_from(Shipment)) or 0

    ship_rows = db.execute(select(Shipment.status, func.count()).group_by(Shipment.status)).all()
    shipments_by_status: dict[str, int] = {s.value: 0 for s in ShipmentStatus}
    for row in ship_rows:
        key = row[0].value if hasattr(row[0], "value") else str(row[0])
        shipments_by_status[key] = int(row[1])

    shipments_by_month: list[dict[str, int | str]] = []
    for delta in range(-5, 1):
        yy, mm = _add_months(now_utc.year, now_utc.month, delta)
        start = _month_start_utc(yy, mm)
        end = _next_month_start(start)
        cnt = (
            db.scalar(
                select(func.count())
                .select_from(Shipment)
                .where(Shipment.created_at >= start, Shipment.created_at < end)
            )
            or 0
        )
        shipments_by_month.append({"month": f"{yy}-{mm:02d}", "count": int(cnt)})

    total_declared_value_usd = (
        db.scalar(select(func.coalesce(func.sum(Shipment.estimated_value), 0)).select_from(Shipment)) or Decimal("0")
    )
    if isinstance(total_declared_value_usd, float):
        total_declared_value_usd = Decimal(str(total_declared_value_usd))

    avg_delivery_days = 0.0
    try:
        raw_avg = db.execute(
            text(
                "SELECT AVG(TIMESTAMPDIFF(DAY, created_at, updated_at)) "
                "FROM shipments WHERE status = 'delivered'"
            )
        ).scalar()
        if raw_avg is not None:
            avg_delivery_days = round(float(raw_avg), 2)
    except Exception:
        delivered_rows = db.execute(
            select(Shipment.created_at, Shipment.updated_at).where(Shipment.status == ShipmentStatus.delivered)
        ).all()
        if delivered_rows:
            acc = 0.0
            for c_at, u_at in delivered_rows:
                if c_at and u_at:
                    acc += max(0.0, (u_at - c_at).total_seconds() / 86400.0)
            avg_delivery_days = round(acc / len(delivered_rows), 2)

    delayed = int(shipments_by_status.get("delayed", 0))
    delay_rate_percent = round((delayed / total_shipments) * 100, 2) if total_shipments else 0.0

    documents_total = db.scalar(select(func.count()).select_from(Document)) or 0
    documents_verified = (
        db.scalar(select(func.count()).select_from(Document).where(Document.is_verified.is_(True))) or 0
    )
    docs_with_ai = (
        db.scalar(select(func.count()).select_from(Document).where(Document.ai_result.isnot(None))) or 0
    )
    ai_verification_rate = (
        round((docs_with_ai / documents_total) * 100, 2) if documents_total else 0.0
    )

    cur_start = _month_start_utc(now_utc.year, now_utc.month)
    cur_end = _next_month_start(cur_start)
    prev_y, prev_m = _add_months(now_utc.year, now_utc.month, -1)
    prev_start = _month_start_utc(prev_y, prev_m)
    prev_end = cur_start

    users_tm = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.created_at >= cur_start, User.created_at < cur_end)
        )
        or 0
    )
    users_lm = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.created_at >= prev_start, User.created_at < prev_end)
        )
        or 0
    )

    ship_tm = (
        db.scalar(
            select(func.count())
            .select_from(Shipment)
            .where(Shipment.created_at >= cur_start, Shipment.created_at < cur_end)
        )
        or 0
    )
    ship_lm = (
        db.scalar(
            select(func.count())
            .select_from(Shipment)
            .where(Shipment.created_at >= prev_start, Shipment.created_at < prev_end)
        )
        or 0
    )

    val_tm = (
        db.scalar(
            select(func.coalesce(func.sum(Shipment.estimated_value), 0))
            .select_from(Shipment)
            .where(Shipment.created_at >= cur_start, Shipment.created_at < cur_end)
        )
        or Decimal("0")
    )
    val_lm = (
        db.scalar(
            select(func.coalesce(func.sum(Shipment.estimated_value), 0))
            .select_from(Shipment)
            .where(Shipment.created_at >= prev_start, Shipment.created_at < prev_end)
        )
        or Decimal("0")
    )
    if isinstance(val_tm, float):
        val_tm = Decimal(str(val_tm))
    if isinstance(val_lm, float):
        val_lm = Decimal(str(val_lm))
    val_tm_i = int(val_tm)
    val_lm_i = int(val_lm)

    delayed_tm = (
        db.scalar(
            select(func.count())
            .select_from(Shipment)
            .where(
                Shipment.status == ShipmentStatus.delayed,
                Shipment.updated_at >= cur_start,
                Shipment.updated_at < cur_end,
            )
        )
        or 0
    )
    delayed_lm = (
        db.scalar(
            select(func.count())
            .select_from(Shipment)
            .where(
                Shipment.status == ShipmentStatus.delayed,
                Shipment.updated_at >= prev_start,
                Shipment.updated_at < prev_end,
            )
        )
        or 0
    )

    kpi_trends = {
        "users_percent": _mom_percent(users_tm, users_lm),
        "shipments_percent": _mom_percent(ship_tm, ship_lm),
        "declared_value_percent": _mom_percent(val_tm_i, val_lm_i),
        "delays_percent": _mom_percent(delayed_tm, delayed_lm),
    }

    monthly_revenue = (
        db.scalar(
            select(func.coalesce(func.sum(Shipment.estimated_value), 0))
            .select_from(Shipment)
            .where(
                Shipment.created_at >= cur_start,
                Shipment.created_at < cur_end,
            )
        )
        or Decimal("0")
    )
    if isinstance(monthly_revenue, float):
        monthly_revenue = Decimal(str(monthly_revenue))

    tracking_in_motion = (
        db.scalar(
            select(func.count())
            .select_from(Shipment)
            .where(
                Shipment.simulation_state == "running",
            )
        )
        or 0
    )
    if not tracking_in_motion:
        tracking_in_motion = (
            db.scalar(
                select(func.count())
                .select_from(Shipment)
                .where(
                    Shipment.status.in_(
                        (
                            ShipmentStatus.in_transit,
                            ShipmentStatus.customs_hold,
                        )
                    )
                )
            )
            or 0
        )

    customs_queue = int(shipments_by_status.get("customs_hold", 0)) + int(
        (documents_total or 0) - (documents_verified or 0)
    )

    return {
        "total_users": int(total_users),
        "users_by_role": users_by_role,
        "total_shipments": int(total_shipments),
        "shipments_by_status": shipments_by_status,
        "shipments_by_month": shipments_by_month,
        "total_declared_value_usd": str(total_declared_value_usd),
        "total_estimated_value": str(total_declared_value_usd),
        "monthly_revenue": str(monthly_revenue),
        "avg_delivery_days": avg_delivery_days,
        "delay_rate_percent": delay_rate_percent,
        "documents_total": int(documents_total),
        "documents_verified": int(documents_verified),
        "ai_verification_rate": ai_verification_rate,
        "kpi_trends": kpi_trends,
        "tracking_in_motion": int(tracking_in_motion),
        "customs_queue": int(customs_queue),
        "pending_documents": int((documents_total or 0) - (documents_verified or 0)),
    }


@router.get("/shipments-by-status")
def shipments_by_status(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    rows = db.execute(
        select(Shipment.status, func.count())
        .where(Shipment.owner_id == current.id)
        .group_by(Shipment.status)
    ).all()
    return {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in rows}


@router.get("/shipments")
def analytics_user_shipments(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    """KPIs and monthly counts — admin & transitaire: all shipments; others: own only."""
    owner = current.id

    if current.role == UserRole.admin or current.role == UserRole.transitaire:

        def _ship_scope(stmt):
            return stmt
    else:

        def _ship_scope(stmt):
            return stmt.where(Shipment.owner_id == owner)

    total = db.scalar(_ship_scope(select(func.count()).select_from(Shipment))) or 0

    gq = _ship_scope(select(Shipment.status, func.count()).select_from(Shipment))
    rows = db.execute(gq.group_by(Shipment.status)).all()
    by_status: dict[str, int] = {s.value: 0 for s in ShipmentStatus}
    for row in rows:
        key = row[0].value if hasattr(row[0], "value") else str(row[0])
        by_status[key] = int(row[1])
    pending = by_status.get("pending", 0)
    in_transit = by_status.get("in_transit", 0)
    delivered = by_status.get("delivered", 0)

    now_utc = datetime.now(timezone.utc)
    start_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    end_today = start_today + timedelta(days=1)
    delivered_today = (
        db.scalar(
            _ship_scope(
                select(func.count())
                .select_from(Shipment)
                .where(
                    Shipment.status == ShipmentStatus.delivered,
                    Shipment.updated_at >= start_today,
                    Shipment.updated_at < end_today,
                )
            )
        )
        or 0
    )

    total_products = (
        0
        if current.role in (UserRole.admin, UserRole.transitaire)
        else (db.scalar(select(func.count()).select_from(Product).where(Product.user_id == owner)) or 0)
    )

    active_scope = (
        select(func.count())
        .select_from(Shipment)
        .where(
            Shipment.status.in_(
                (
                    ShipmentStatus.pending,
                    ShipmentStatus.in_transit,
                    ShipmentStatus.customs_hold,
                    ShipmentStatus.delayed,
                )
            )
        )
    )
    active_shipments = db.scalar(_ship_scope(active_scope)) or 0

    month_start = _month_start_utc(now_utc.year, now_utc.month)
    month_end = _next_month_start(month_start)
    delivered_this_month = (
        db.scalar(
            _ship_scope(
                select(func.count())
                .select_from(Shipment)
                .where(
                    Shipment.status == ShipmentStatus.delivered,
                    Shipment.updated_at >= month_start,
                    Shipment.updated_at < month_end,
                )
            )
        )
        or 0
    )

    by_month: list[dict[str, int | str]] = []
    revenue_by_month: list[dict[str, str | float]] = []
    for delta in range(-5, 1):
        yy, mm = _add_months(now_utc.year, now_utc.month, delta)
        start = _month_start_utc(yy, mm)
        end = _next_month_start(start)
        cnt = (
            db.scalar(
                _ship_scope(
                    select(func.count())
                    .select_from(Shipment)
                    .where(
                        Shipment.created_at >= start,
                        Shipment.created_at < end,
                    )
                )
            )
            or 0
        )
        by_month.append({"month": f"{yy}-{mm:02d}", "count": int(cnt)})

        rev = (
            db.scalar(
                _ship_scope(
                    select(func.coalesce(func.sum(Shipment.estimated_value), 0))
                    .select_from(Shipment)
                    .where(
                        Shipment.created_at >= start,
                        Shipment.created_at < end,
                    )
                )
            )
            or Decimal("0")
        )
        if isinstance(rev, float):
            rev = Decimal(str(rev))
        revenue_by_month.append({"month": f"{yy}-{mm:02d}", "revenue": float(rev)})

    recent_q = (
        _ship_scope(select(Shipment))
        .options(joinedload(Shipment.owner))
        .order_by(Shipment.created_at.desc())
        .limit(10)
    )
    recent_rows = db.scalars(recent_q).unique().all()
    recent_shipments = []
    for s in recent_rows:
        own = s.owner
        recent_shipments.append(
            {
                "id": s.id,
                "reference": s.reference,
                "owner_id": s.owner_id,
                "owner_name": own.full_name if own else "",
                "owner_email": own.email if own else "",
                "origin": s.origin,
                "destination": s.destination,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "estimated_value": str(s.estimated_value) if s.estimated_value is not None else None,
                "currency": s.currency,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
        )

    return {
        "total": int(total),
        "total_shipments": int(total),
        "by_status": by_status,
        "pending": pending,
        "in_transit": in_transit,
        "delivered": delivered,
        "by_month": by_month,
        "total_products": int(total_products),
        "active_shipments": int(active_shipments),
        "delivered_this_month": int(delivered_this_month),
        "revenue_by_month": revenue_by_month,
        "delayed": int(by_status.get("delayed", 0)),
        "delivered_today": int(delivered_today),
        "recent_shipments": recent_shipments,
        "recent_5": recent_shipments[:5],
    }


@router.get("/documents")
def analytics_documents(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict[str, int]:
    """Document verification stats (scoped by role)."""
    if current.role in (UserRole.admin, UserRole.courtier):
        scope = select(Document)
    else:
        scope = select(Document).where(Document.uploaded_by == current.id)

    total = db.scalar(select(func.count()).select_from(scope.subquery())) or 0
    verified = (
        db.scalar(
            select(func.count()).select_from(
                scope.where(Document.is_verified.is_(True)).subquery()
            )
        )
        or 0
    )
    pending_review = int(total) - int(verified)
    return {
        "total_documents": int(total),
        "verified": int(verified),
        "pending_review": pending_review,
    }


def _shipments_for_bi(db: Session, current: User) -> list[Shipment]:
    """Scope shipments for predictive BI (historical + active)."""
    q = select(Shipment).options(
        joinedload(Shipment.documents),
        joinedload(Shipment.forwarder),
        joinedload(Shipment.owner),
    )
    if current.role == UserRole.admin or current.role == UserRole.transitaire:
        return list(db.scalars(q.order_by(Shipment.created_at.desc())).unique().all())
    if current.role == UserRole.exportateur:
        return list(
            db.scalars(
                q.where(
                    or_(
                        Shipment.owner_id == current.id,
                        Shipment.exporter_user_id == current.id,
                    )
                ).order_by(Shipment.created_at.desc())
            )
            .unique()
            .all()
        )
    return list(
        db.scalars(q.where(Shipment.owner_id == current.id).order_by(Shipment.created_at.desc()))
        .unique()
        .all()
    )


@router.get("/predictive-bi")
def analytics_predictive_bi(
    include_ai_summary: bool = Query(True, description="Enrichir avec synthèse Gemini"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    _: User = _bi_roles,
) -> dict:
    """
    BI prédictif : risque de retard par expédition, performance transitaires, corridors.
    IA documentaire (Gemini) + scoring historique transparent.
    """
    shipments = _shipments_for_bi(db, current)
    engine_bi = DelayPredictionEngine(db)
    report = engine_bi.build_report(shipments)
    report["viewer_role"] = current.role.value if hasattr(current.role, "value") else str(current.role)

    if include_ai_summary:
        report["ai_insights"] = generate_ai_executive_summary(report)
    else:
        report["ai_insights"] = {
            "summary_text": "",
            "provider": "none",
            "ai_enhanced": False,
        }
    return report
