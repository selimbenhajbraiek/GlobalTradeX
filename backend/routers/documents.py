import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.document import Document, TradeDocumentType
from models.notification import Notification, NotificationType
from models.shipment import Shipment
from models.user import User, UserRole
from schemas.document import DocumentBrokerRow, DocumentResponse, DocumentVerifyBody
from services.llm_service import LLMService

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

_broker_dep = require_role(["courtier", "admin"])


def _is_admin(user: User) -> bool:
    return user.role == UserRole.admin


def _can_access_shipment_docs(current: User, shipment_id: int | None, db: Session) -> bool:
    if shipment_id is None:
        return False
    if _is_admin(current) or current.role in (UserRole.courtier, UserRole.transitaire):
        return True
    sh = db.get(Shipment, shipment_id)
    if not sh:
        return False
    if sh.owner_id == current.id:
        return True
    return sh.exporter_user_id == current.id


def _can_read_document(current: User, doc: Document, db: Session) -> bool:
    if _is_admin(current) or current.role == UserRole.courtier:
        return True
    if doc.uploaded_by == current.id:
        return True
    if doc.shipment_id:
        sh = db.get(Shipment, doc.shipment_id)
        if sh and (
            sh.owner_id == current.id
            or sh.exporter_user_id == current.id
            or current.role == UserRole.transitaire
        ):
            return True
    return False


def _can_delete_document(current: User, doc: Document, db: Session) -> bool:
    if _is_admin(current):
        return True
    if doc.uploaded_by == current.id:
        return True
    return False


def _parse_trade_type(raw: str | None) -> TradeDocumentType:
    if not raw or not str(raw).strip():
        return TradeDocumentType.other
    try:
        return TradeDocumentType(str(raw).strip())
    except ValueError:
        allowed = ", ".join(e.value for e in TradeDocumentType)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file_type. Expected one of: {allowed}",
        ) from None


def _to_broker_row(doc: Document) -> DocumentBrokerRow:
    return DocumentBrokerRow(
        id=doc.id,
        shipment_id=doc.shipment_id,
        uploaded_by=doc.uploaded_by,
        filename=doc.filename,
        original_name=doc.original_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        file_path=doc.file_path,
        is_verified=doc.is_verified,
        ai_result=doc.ai_result,
        uploaded_at=doc.uploaded_at,
        verified_at=doc.verified_at,
        uploader_name=doc.uploader.full_name if doc.uploader else None,
        shipment_reference=doc.shipment.reference if doc.shipment else None,
    )


def _to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        shipment_id=doc.shipment_id,
        uploaded_by=doc.uploaded_by,
        filename=doc.filename,
        original_name=doc.original_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        file_path=doc.file_path,
        is_verified=doc.is_verified,
        ai_result=doc.ai_result,
        uploaded_at=doc.uploaded_at,
        verified_at=doc.verified_at,
        uploader_name=doc.uploader.full_name if doc.uploader else None,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    shipment_id: int = Form(...),
    file_type: str = Form(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> DocumentResponse:
    sh = db.get(Shipment, shipment_id)
    if sh is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    allowed_uploader = (
        sh.owner_id == current.id
        or sh.exporter_user_id == current.id
        or _is_admin(current)
        or current.role == UserRole.transitaire
    )
    if not allowed_uploader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload documents to your own shipments",
        )

    original = file.filename or "upload"
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, JPG, JPEG, and PNG files are allowed",
        )

    trade_type = _parse_trade_type(file_type)

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )

    safe_name = f"{uuid.uuid4()}{ext}"
    path = UPLOAD_DIR / safe_name
    path.write_bytes(data)

    doc = Document(
        shipment_id=shipment_id,
        uploaded_by=current.id,
        filename=safe_name,
        original_name=original,
        file_type=trade_type,
        file_size=len(data),
        file_path=str(path.relative_to(BACKEND_ROOT)),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_response(doc)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    q = (
        select(Document)
        .options(joinedload(Document.uploader))
        .order_by(Document.uploaded_at.desc())
    )
    if current.role not in (UserRole.courtier, UserRole.admin):
        q = q.where(Document.uploaded_by == current.id)
    docs = db.scalars(q).unique().all()
    return [_to_response(d) for d in docs]


@router.get("/pending-review", response_model=list[DocumentBrokerRow])
def pending_review_documents(
    db: Session = Depends(get_db),
    current: User = Depends(_broker_dep),
) -> list[DocumentBrokerRow]:
    docs = db.scalars(
        select(Document)
        .options(joinedload(Document.uploader), joinedload(Document.shipment))
        .where(Document.is_verified.is_(False))
        .order_by(Document.uploaded_at.asc())
    ).unique().all()
    return [_to_broker_row(d) for d in docs]


@router.get("/recently-verified-today", response_model=list[DocumentBrokerRow])
def recently_verified_today(
    db: Session = Depends(get_db),
    current: User = Depends(_broker_dep),
) -> list[DocumentBrokerRow]:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    docs = db.scalars(
        select(Document)
        .options(joinedload(Document.uploader), joinedload(Document.shipment))
        .where(Document.is_verified.is_(True), Document.verified_at >= start)
        .order_by(Document.verified_at.desc())
    ).unique().all()
    return [_to_broker_row(d) for d in docs]


@router.get("/shipment/{shipment_id}", response_model=list[DocumentResponse])
def list_documents_for_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    """All documents for a shipment, newest first (includes uploader name, ai_result)."""
    if not _can_access_shipment_docs(current, shipment_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view documents for this shipment",
        )
    rows = db.scalars(
        select(Document)
        .options(joinedload(Document.uploader))
        .where(Document.shipment_id == shipment_id)
        .order_by(Document.uploaded_at.desc())
    ).unique().all()
    return [_to_response(d) for d in rows]


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> FileResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not doc.shipment_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document has no shipment")
    if not _can_read_document(current, doc, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to download this file")

    abs_path = BACKEND_ROOT / doc.file_path
    if not abs_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    media = mimetypes.guess_type(abs_path.name)[0] or "application/octet-stream"
    return FileResponse(
        path=str(abs_path),
        media_type=media,
        filename=doc.original_name,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not _can_delete_document(current, doc, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this document")

    abs_path = BACKEND_ROOT / doc.file_path
    db.delete(doc)
    db.commit()
    if abs_path.is_file():
        try:
            abs_path.unlink()
        except OSError:
            pass


@router.patch("/{document_id}/verify", response_model=DocumentResponse)
def verify_document(
    document_id: int,
    payload: DocumentVerifyBody,
    db: Session = Depends(get_db),
    current: User = Depends(_broker_dep),
) -> DocumentResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc.is_verified = payload.is_verified
    if payload.is_verified:
        doc.verified_at = datetime.now(timezone.utc)
        if doc.ai_result and isinstance(doc.ai_result, dict):
            ar = dict(doc.ai_result)
            ar.pop("rejection_reason", None)
            doc.ai_result = ar
    else:
        doc.verified_at = None
        merged = dict(doc.ai_result or {})
        merged["rejection_reason"] = (payload.rejection_reason or "").strip()
        doc.ai_result = merged

    db.flush()

    status_word = "verified" if payload.is_verified else "rejected"
    db.add(
        Notification(
            user_id=doc.uploaded_by,
            title="Document review complete",
            message=f"Your document {doc.original_name} has been {status_word}",
            notification_type=NotificationType.info,
            shipment_id=doc.shipment_id,
        )
    )
    db.commit()
    db.refresh(doc)
    db.refresh(doc, ["uploader"])
    return _to_response(doc)


class AiVerifyResponse(BaseModel):
    ai_result: dict
    document_id: int


@router.post("/{document_id}/ai-verify", response_model=AiVerifyResponse)
def ai_verify_document(
    document_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(_broker_dep),
) -> AiVerifyResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    abs_path = BACKEND_ROOT / doc.file_path
    if not abs_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stored file not found on disk",
        )

    svc = LLMService()
    result = svc.analyze_customs_document(abs_path)
    doc.ai_result = result
    db.commit()
    db.refresh(doc)
    return AiVerifyResponse(ai_result=result, document_id=doc.id)
