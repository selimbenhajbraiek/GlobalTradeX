from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from models.user import User
from services.openai_service import OpenAIService

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str = ""
    error: str | None = None


class VerifyDocumentRequest(BaseModel):
    document_id: int
    expected_type: str = "invoice"


class VerifyDocumentResponse(BaseModel):
    valid: bool = False
    confidence: float = 0.0
    notes: str = "Placeholder — connect OCR / classification pipeline."


class SuggestRoutesRequest(BaseModel):
    origin: str = ""
    destination: str = ""
    cargo_description: str = ""


class SuggestRoutesResponse(BaseModel):
    routes: list[dict[str, str]] = Field(default_factory=list)


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    payload: ChatRequest,
    _: User = Depends(get_current_user),
) -> ChatResponse:
    svc = OpenAIService()
    out = svc.chat(payload.messages or [{"role": "user", "content": "Hello"}])
    return ChatResponse(reply=out.get("reply", ""), error=out.get("error"))


@router.post("/verify-document", response_model=VerifyDocumentResponse)
def verify_document(
    payload: VerifyDocumentRequest,
    _: User = Depends(get_current_user),
) -> VerifyDocumentResponse:
    return VerifyDocumentResponse(valid=True, confidence=0.85)


@router.post("/suggest-routes", response_model=SuggestRoutesResponse)
def suggest_routes(
    payload: SuggestRoutesRequest,
    _: User = Depends(get_current_user),
) -> SuggestRoutesResponse:
    return SuggestRoutesResponse(
        routes=[
            {"mode": "sea", "summary": f"{payload.origin} → {payload.destination} (example)"},
            {"mode": "air", "summary": "Express option (example)"},
        ]
    )
