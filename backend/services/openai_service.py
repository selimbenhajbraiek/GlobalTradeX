import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any

from config import get_settings

logger = logging.getLogger(__name__)


class OpenAIService:
    """OpenAI API wrapper (set OPENAI_API_KEY in .env)."""

    def __init__(self) -> None:
        self._settings = get_settings()

    def chat(self, messages: list[dict[str, str]], model: str = "gpt-4o-mini") -> dict[str, Any]:
        if not self._settings.openai_api_key:
            logger.warning("OpenAI API key not set")
            return {"reply": "", "error": "OPENAI_API_KEY not configured"}
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self._settings.openai_api_key)
            completion = client.chat.completions.create(model=model, messages=messages)
            text = completion.choices[0].message.content or ""
            return {"reply": text}
        except Exception as e:
            logger.exception("OpenAI chat failed: %s", e)
            return {"reply": "", "error": str(e)}

    def analyze_customs_document(self, file_path: Path) -> dict[str, Any]:
        """Vision + JSON: customs compliance structure. Returns dict with valid, document_type, etc."""
        if not self._settings.openai_api_key:
            return {
                "valid": False,
                "document_type": "unknown",
                "missing_fields": [],
                "errors": ["OPENAI_API_KEY not configured"],
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

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self._settings.openai_api_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_parts},
                ],
                response_format={"type": "json_object"},
            )
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
            logger.exception("OpenAI vision analysis failed: %s", e)
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
        model: str = "gpt-4o",
    ) -> dict[str, Any]:
        """Ask GPT-4o for exactly 3 freight routes as a JSON array (raw model reply)."""
        if not self._settings.openai_api_key:
            logger.warning("OpenAI API key not set")
            return {"text": "", "error": "OPENAI_API_KEY not configured"}
        system_prompt = (
            f"You are a freight routing expert. Given a shipment from {origin} to {destination}, "
            f"cargo type {cargo_type}, weight {weight_kg}kg, urgency {urgency}, "
            "suggest exactly 3 shipping routes as a JSON array. Each route must have: "
            "carrier (string), mode (air/sea/road/rail), cost_usd (number), "
            "eta_days (number), risk_level (low/medium/high), notes (string). "
            "Return ONLY the JSON array, no other text."
        )
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self._settings.openai_api_key)
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Return the JSON array now."},
                ],
                temperature=0.4,
            )
            text = completion.choices[0].message.content or ""
            return {"text": text.strip(), "error": None}
        except Exception as e:
            logger.exception("OpenAI suggest_freight_routes failed: %s", e)
            return {"text": "", "error": str(e)}
