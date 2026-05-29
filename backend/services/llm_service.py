import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any

from config import get_settings
from services.llm_client import create_llm_client, default_llm_model, llm_api_key

logger = logging.getLogger(__name__)


class LLMService:
    """Gemini via OpenAI-compatible API (GOOGLE_API_KEY in .env)."""

    def __init__(self) -> None:
        self._settings = get_settings()

    def _client(self):
        return create_llm_client()

    def _model(self, model: str | None) -> str:
        return (model or "").strip() or default_llm_model(self._settings)

    def chat(self, messages: list[dict[str, str]], model: str | None = None) -> dict[str, Any]:
        if not llm_api_key(self._settings):
            logger.warning("GOOGLE_API_KEY not set")
            return {"reply": "", "error": "GOOGLE_API_KEY not configured"}
        client = self._client()
        if client is None:
            return {"reply": "", "error": "GOOGLE_API_KEY not configured"}
        try:
            completion = client.chat.completions.create(
                model=self._model(model),
                messages=messages,
            )
            text = completion.choices[0].message.content or ""
            return {"reply": text}
        except Exception as e:
            logger.exception("Gemini chat failed: %s", e)
            return {"reply": "", "error": str(e)}

    def analyze_customs_document(self, file_path: Path) -> dict[str, Any]:
        """Vision + JSON: customs compliance structure."""
        if not llm_api_key(self._settings):
            return {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": ["GOOGLE_API_KEY not configured"],
                "confidence": 0.0,
            }
        if not file_path.is_file():
            return {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": ["File not found"],
                "confidence": 0.0,
            }

        data = file_path.read_bytes()
        mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        b64 = base64.standard_b64encode(data).decode("ascii")
        data_url = f"data:{mime};base64,{b64}"

        system_prompt = (
            "You are a customs compliance expert. Analyze this document. "
            "Identify: document type, missing required fields, invalid data, "
            "and return a JSON with: {valid: bool, document_type: str, "
            "missing_fields: [], errors: [], confidence: float}"
        )

        user_parts: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": "Analyze this document and respond with ONLY valid JSON matching the schema above.",
            }
        ]

        if mime.startswith("image/") or mime == "application/pdf":
            user_parts.append({"type": "image_url", "image_url": {"url": data_url}})
        else:
            return {
                "valid": False,
                "document_type": str(mime),
                "missing_fields": [],
                "errors": [f"Unsupported file type for vision: {mime}"],
                "confidence": 0.0,
            }

        client = self._client()
        if client is None:
            return {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": ["GOOGLE_API_KEY not configured"],
                "confidence": 0.0,
            }

        try:
            kwargs: dict[str, Any] = {
                "model": default_llm_model(self._settings),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_parts},
                ],
            }
            try:
                completion = client.chat.completions.create(
                    **kwargs,
                    response_format={"type": "json_object"},
                )
            except Exception:
                completion = client.chat.completions.create(**kwargs)
            text = completion.choices[0].message.content or "{}"
            parsed = json.loads(text)
            if not isinstance(parsed, dict):
                raise ValueError("expected object")
            defaults: dict[str, Any] = {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": [],
                "confidence": 0.0,
            }
            defaults.update(parsed)
            return defaults
        except Exception as e:
            logger.exception("Gemini vision analysis failed: %s", e)
            return {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": [str(e)],
                "confidence": 0.0,
            }

    def suggest_freight_routes(
        self,
        *,
        origin: str,
        destination: str,
        cargo_type: str,
        weight_kg: float,
        urgency: str,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Suggest exactly 3 freight routes as a JSON array (raw model reply)."""
        if not llm_api_key(self._settings):
            logger.warning("GOOGLE_API_KEY not set")
            return {"text": "", "error": "GOOGLE_API_KEY not configured"}
        system_prompt = (
            f"You are a freight routing expert. Given a shipment from {origin} to {destination}, "
            f"cargo type {cargo_type}, weight {weight_kg}kg, urgency {urgency}, "
            "suggest exactly 3 shipping routes as a JSON array. Each route must have: "
            "carrier (string), mode (air/sea/road/rail), cost_usd (number), "
            "eta_days (number), risk_level (low/medium/high), notes (string). "
            "Return ONLY the JSON array, no other text."
        )
        client = self._client()
        if client is None:
            return {"text": "", "error": "GOOGLE_API_KEY not configured"}
        try:
            completion = client.chat.completions.create(
                model=self._model(model),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Return the JSON array now."},
                ],
                temperature=0.4,
            )
            text = completion.choices[0].message.content or ""
            return {"text": text.strip(), "error": None}
        except Exception as e:
            logger.exception("Gemini suggest_freight_routes failed: %s", e)
            return {"text": "", "error": str(e)}


# Backward-compatible alias
OpenAIService = LLMService
