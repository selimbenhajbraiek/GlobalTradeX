from __future__ import annotations

from typing import Any

from assistant.knowledge import build_knowledge_context
from assistant.sessions import AssistantSession
from services.llm_service import LLMService

SYSTEM_PROMPT = (
    "You are the official GlobalTradeX onboarding and support specialist. "
    "Speak like a professional human support agent: warm, confident, and practical. "
    "You are an expert in importer workflows, shipment tracking, dashboard usage, documents, "
    "products, calculator, analytics, notifications, and admin operations. "
    "Answer in 2-3 short conversational sentences that sound natural when spoken aloud. "
    "Guide the user to the exact next screen or action. "
    "Never invent platform features. "
    "If you are not sure, say: "
    "\"I'm not sure, but I can guide you to the right section.\" "
    "Prefer the user's language when they write in Arabic or French; otherwise use English."
)


class AssistantService:
    """LLM-backed support replies with short conversation context."""

    def __init__(self) -> None:
        self._llm = LLMService()

    def build_messages(
        self,
        session: AssistantSession,
        user_message: str,
        *,
        persona: dict[str, Any] | None = None,
    ) -> list[dict[str, str]]:
        knowledge = build_knowledge_context(
            user_role=session.user_role,
            recent_shipments=session.recent_shipments,
        )
        persona_lines = ""
        if persona:
            persona_lines = (
                "Assistant persona: "
                f"tone={persona.get('tone', 'friendly')}, "
                f"style={persona.get('style', 'concise')}, "
                f"expertise={persona.get('expertise', 'platform expert')}.\n"
            )
        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": f"{SYSTEM_PROMPT}\n{persona_lines}\nPlatform context:\n{knowledge}",
            }
        ]
        for item in session.messages[-8:]:
            role = (item.get("role") or "").strip().lower()
            content = (item.get("content") or "").strip()
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_message.strip()})
        return messages

    def generate_reply(
        self,
        session: AssistantSession,
        user_message: str,
        *,
        persona: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        text = user_message.strip()
        if not text:
            return {"text": "", "error": "Message is required"}

        demo = self._demo_reply(text)
        if demo is not None:
            return {"text": demo, "source": "demo"}

        messages = self.build_messages(session, text, persona=persona)
        out = self._llm.chat(messages)
        reply = (out.get("reply") or "").strip()
        err = out.get("error")
        if err and not reply:
            return {"text": self._fallback_reply(text), "error": str(err), "source": "fallback"}
        if not reply:
            reply = self._fallback_reply(text)
        return {"text": reply, "source": "llm"}

    def _demo_reply(self, message: str) -> str | None:
        q = message.lower()
        if "track" in q and "shipment" in q:
            return (
                "Open Shipments from your dashboard, select your reference, and use the tracking map "
                "on the shipment detail page to follow progress in real time."
            )
        if "in_transit" in q or "in transit" in q:
            return (
                "In transit means your shipment is actively moving toward the destination. "
                "Check the tracking timeline and ETA on the shipment detail page for the latest position."
            )
        if "create" in q and "shipment" in q:
            return (
                "Go to Shipments and choose New shipment. Enter origin, destination, cargo details, "
                "then confirm the route to create the shipment."
            )
        if "delay" in q:
            return (
                "Delays often come from customs holds, missing documents, or carrier schedule changes. "
                "Review the shipment status, tracking progress, and uploaded documents on the detail page."
            )
        return None

    def _fallback_reply(self, message: str) -> str:
        if self._demo_reply(message):
            return self._demo_reply(message) or (
                "I'm not sure, but I can guide you to the right section. Try Shipments or Documents from the sidebar."
            )
        return (
            "I'm not sure, but I can guide you to the right section. "
            "Use Shipments for tracking and creation, or Documents for customs paperwork."
        )
