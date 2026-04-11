import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.document import Document, DocumentFileType
from models.notification import Notification, NotificationType
from models.shipment import Shipment
from models.user import User, UserRole
from schemas.document import DocumentBrokerRow, DocumentResponse, DocumentVerifyBody
from services.openai_service import OpenAIService

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Callables returned by require_role — wrap with Depends() only once per parameter.
_shipment_docs_dep = require_role(["courtier", "admin", "importateur", "exportateur"])
_broker_dep = require_role(["courtier", "admin"])


def _guess_file_type(filename: str, hint: str | None) -> DocumentFileType:
    if hint:
        try:
            return DocumentFileType(hint)
        except ValueError:
            pass
    ext = (Path(filename or "").suffix or "").lower()
    if ext == ".pdf":
        return DocumentFileType.pdf
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}:
        return DocumentFileType.image
    if ext in {".xlsx", ".xls", ".csv"}:
        return DocumentFileType.spreadsheet
    if ext in {".doc", ".docx"}:
        return DocumentFileType.word
    if ext in {".zip", ".rar", ".7z", ".tar", ".gz"}:
        return DocumentFileType.archive
    return DocumentFileType.other


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


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    shipment_id: int | None = Form(None),
    file_type: str | None = Form(None),
    doc_type: str | None = Form(None),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Document:
    hint = file_type or doc_type
    if shipment_id is not None:
        sh = db.get(Shipment, shipment_id)
        if not sh or sh.owner_id != current.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shipment")

    ext = Path(file.filename or "file").suffix[:32]
    safe_name = f"{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / safe_name
    data = await file.read()
    path.write_bytes(data)

    original = file.filename or safe_name
    ftype = _guess_file_type(original, hint)

    doc = Document(
        shipment_id=shipment_id,
        uploaded_by=current.id,
        filename=safe_name,
        original_name=original,
        file_type=ftype,
        file_size=len(data),
        file_path=str(path.relative_to(BACKEND_ROOT)),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Document]:
    q = select(Document)
    if current.role not in (UserRole.courtier, UserRole.admin):
        q = q.where(Document.uploaded_by == current.id)
    return list(db.scalars(q.order_by(Document.uploaded_at.desc())).all())


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
    ).all()
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
    ).all()
    return [_to_broker_row(d) for d in docs]


@router.get("/shipment/{shipment_id}", response_model=list[DocumentResponse])
def list_documents_for_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(_shipment_docs_dep),
) -> list[Document]:
    """All documents for a shipment (includes ai_result when set)."""
    if current.role not in (UserRole.courtier, UserRole.admin):
        sh = db.get(Shipment, shipment_id)
        if not sh or sh.owner_id != current.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view documents for this shipment",
            )
    rows = db.scalars(
        select(Document).where(Document.shipment_id == shipment_id).order_by(Document.uploaded_at.desc())
    ).all()
    return list(rows)


@router.patch("/{document_id}/verify", response_model=DocumentResponse)
def verify_document(
    document_id: int,
    payload: DocumentVerifyBody,
    db: Session = Depends(get_db),
    current: User = Depends(_broker_dep),
) -> Document:
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
    return doc


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

    svc = OpenAIService()
    result = svc.analyze_customs_document(abs_path)
    doc.ai_result = result
    db.commit()
    db.refresh(doc)
    return AiVerifyResponse(ai_result=result, document_id=doc.id)
