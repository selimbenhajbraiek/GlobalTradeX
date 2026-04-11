from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.document import Document
from models.product import Product
from models.shipment import Shipment, ShipmentStatus
from models.user import User, UserRole

router = APIRouter()

_admin_only = Depends(require_role(["admin"]))


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
    """Global revenue / volume analytics (admin only)."""
    total_shipments = db.scalar(select(func.count()).select_from(Shipment)) or 0
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_docs = db.scalar(select(func.count()).select_from(Document)) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Shipment.estimated_value), 0))) or Decimal("0")
    if isinstance(revenue, float):
        revenue = Decimal(str(revenue))
    rows = db.execute(
        select(Shipment.status, func.count()).group_by(Shipment.status)
    ).all()
    by_status = {
        (row[0].value if hasattr(row[0], "value") else str(row[0])): row[1] for row in rows
    }
    delayed = int(by_status.get("delayed", 0))
    delay_rate_percent = (
        round((delayed / total_shipments) * 100, 2) if total_shipments else 0.0
    )

    now_utc = datetime.now(timezone.utc)
    cur_start = _month_start_utc(now_utc.year, now_utc.month)
    cur_end = _next_month_start(cur_start)
    monthly_rev = (
        db.scalar(
            select(func.coalesce(func.sum(Shipment.estimated_value), 0)).where(
                Shipment.created_at >= cur_start,
                Shipment.created_at < cur_end,
            )
        )
        or Decimal("0")
    )
    if isinstance(monthly_rev, float):
        monthly_rev = Decimal(str(monthly_rev))

    return {
        "total_users": total_users,
        "total_shipments": total_shipments,
        "total_documents": total_docs,
        "total_estimated_value": str(revenue),
        "shipments_by_status": by_status,
        "delay_rate_percent": delay_rate_percent,
        "monthly_revenue": str(monthly_rev),
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
    """KPIs and monthly counts — owner-scoped, except freight forwarder (global shipment stats)."""
    is_forwarder = current.role == UserRole.transitaire
    owner = current.id

    def _ship_scope(stmt):
        if is_forwarder:
            return stmt
        return stmt.where(Shipment.owner_id == owner)

    total = db.scalar(_ship_scope(select(func.count()).select_from(Shipment))) or 0

    gq = select(Shipment.status, func.count()).select_from(Shipment)
    if not is_forwarder:
        gq = gq.where(Shipment.owner_id == owner)
    rows = db.execute(gq.group_by(Shipment.status)).all()
    by_status = {
        (row[0].value if hasattr(row[0], "value") else str(row[0])): int(row[1]) for row in rows
    }
    pending = by_status.get("pending", 0)
    in_transit = by_status.get("in_transit", 0)
    delivered = by_status.get("delivered", 0)

    now_utc = datetime.now(timezone.utc)

    total_products = (
        0
        if is_forwarder
        else (
            db.scalar(select(func.count()).select_from(Product).where(Product.user_id == owner)) or 0
        )
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

    return {
        "total_shipments": int(total),
        "pending": pending,
        "in_transit": in_transit,
        "delivered": delivered,
        "by_month": by_month,
        "total_products": int(total_products),
        "active_shipments": int(active_shipments),
        "delivered_this_month": int(delivered_this_month),
        "revenue_by_month": revenue_by_month,
        "delayed": int(by_status.get("delayed", 0)),
    }


@router.get("/documents")
def analytics_documents(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict[str, int]:
    """Document verification stats (global counts)."""
    total = db.scalar(select(func.count()).select_from(Document)) or 0
    verified = db.scalar(select(func.count()).select_from(Document).where(Document.is_verified.is_(True))) or 0
    pending_review = int(total) - int(verified)
    return {
        "total_documents": int(total),
        "verified": int(verified),
        "pending_review": pending_review,
    }
