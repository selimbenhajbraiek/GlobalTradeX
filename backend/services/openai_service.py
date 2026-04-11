import logging
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
