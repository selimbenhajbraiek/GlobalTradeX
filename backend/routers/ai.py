import json
import re
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import get_current_user
from models.user import User
from services.openai_service import OpenAIService

router = APIRouter()


class ImporterChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[dict[str, str]] = Field(default_factory=list)
    user_role: str = ""
    recent_shipments: list[Any] = Field(default_factory=list)


class ImporterChatResponse(BaseModel):
    response: str = ""
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
    cargo_type: str = "general"
    weight_kg: float = Field(default=0, ge=0)
    urgency: Literal["normal", "express"] = "normal"


class RouteSuggestionOut(BaseModel):
    carrier: str
    mode: Literal["air", "sea", "road", "rail"]
    cost_usd: float = Field(..., ge=0)
    eta_days: int = Field(..., ge=1)
    risk_level: Literal["low", "medium", "high"]
    notes: str = ""

    @model_validator(mode="before")
    @classmethod
    def _normalize_llm(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        m = dict(data)
        if isinstance(m.get("mode"), str):
            m["mode"] = m["mode"].strip().lower()
        if isinstance(m.get("risk_level"), str):
            m["risk_level"] = m["risk_level"].strip().lower()
        ed = m.get("eta_days")
        if isinstance(ed, float):
            m["eta_days"] = int(round(ed))
        return m


class SuggestRoutesResponse(BaseModel):
    routes: list[RouteSuggestionOut]


def _extract_json_array(text: str) -> list:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        inner = "\n".join(lines[1:])
        inner = re.sub(r"```\s*$", "", inner, flags=re.MULTILINE).strip()
        t = inner
    data = json.loads(t)
    if isinstance(data, dict):
        for key in ("routes", "items", "data"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break
        else:
            raise ValueError("Expected a JSON array or an object containing a list")
    if not isinstance(data, list):
        raise ValueError("Top-level JSON must be an array")
    return data


@router.post("/chat", response_model=ImporterChatResponse)
def ai_chat(
    payload: ImporterChatRequest,
    _: User = Depends(get_current_user),
) -> ImporterChatResponse:
    recent_json = json.dumps(payload.recent_shipments or [], default=str)
    system_content = (
        "You are a helpful assistant for GlobalTradeX, an international trade platform.\n"
        f"The user is a {payload.user_role or 'user'}. Their recent shipments are:\n{recent_json}.\n"
        "Answer trade and logistics questions clearly and concisely.\n"
        "If asked about a specific shipment, use the shipment data provided.\n"
        "If asked about customs holds, explain common reasons: missing documents, "
        "incorrect HS codes, undervalued goods, restricted products."
    )
    messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
    for h in (payload.history or [])[-5:]:
        role = (h.get("role") or "user").strip().lower()
        content = (h.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": payload.message.strip()})

    svc = OpenAIService()
    out = svc.chat(messages, model="gpt-4o")
    return ImporterChatResponse(response=out.get("reply", ""), error=out.get("error"))


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
    svc = OpenAIService()
    out = svc.suggest_freight_routes(
        origin=payload.origin.strip() or "unknown origin",
        destination=payload.destination.strip() or "unknown destination",
        cargo_type=(payload.cargo_type or "general").strip(),
        weight_kg=float(payload.weight_kg),
        urgency=payload.urgency,
        model="gpt-4o",
    )
    err = out.get("error")
    raw_text = out.get("text") or ""
    if err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI route suggestion failed: {err}",
        )
    try:
        arr = _extract_json_array(raw_text)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not parse AI response as JSON array: {e}",
        ) from e

    if len(arr) != 3:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Expected exactly 3 routes, got {len(arr)}",
        )

    validated: list[RouteSuggestionOut] = []
    for i, item in enumerate(arr):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Route {i} is not a JSON object",
            )
        try:
            validated.append(RouteSuggestionOut.model_validate(item))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Invalid route {i}: {e}",
            ) from e

    return SuggestRoutesResponse(routes=validated)
