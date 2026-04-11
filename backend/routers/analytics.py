from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user
from models.document import Document
from models.shipment import Shipment
from models.user import User

router = APIRouter()


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
