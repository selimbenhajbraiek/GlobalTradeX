import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user
from models.document import Document, DocumentFileType
from models.shipment import Shipment
from models.user import User
from schemas.document import DocumentResponse

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
    return list(db.scalars(select(Document).where(Document.uploaded_by == current.id)).all())
