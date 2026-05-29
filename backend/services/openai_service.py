"""Deprecated module path — use services.llm_service.LLMService."""

from services.llm_service import LLMService, OpenAIService

__all__ = ["LLMService", "OpenAIService"]
