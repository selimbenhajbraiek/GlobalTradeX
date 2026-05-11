"""Static platform knowledge injected into the video assistant system prompt."""

PLATFORM_KNOWLEDGE = """
GlobalTradeX is an international trade and logistics platform for importers, exporters,
customs brokers (courtier), freight forwarders (transitaire), and administrators.

Core features:
- Dashboard: role-based operational overview, KPIs, and shortcuts.
- Shipments: create shipments, assign products, update lifecycle status, and view details.
- Live tracking: GPS-style route simulation with start, pause, and reset controls.
- Documents: upload trade documents, review, verify, and AI-assisted customs checks.
- Products: catalog of goods with HS codes and trade metadata.
- Calculator: estimate duties and freight costs.
- Analytics: shipment and document metrics for admins and operators.
- Notifications: in-app alerts for status changes and document events.

Shipment statuses:
- pending: created but not yet moving.
- in_transit: actively moving toward the destination.
- customs_hold: held at customs; often missing or invalid documents.
- delivered: completed at destination.
- delayed: behind schedule; check tracking and documents.
- cancelled: shipment stopped.

Importer workflows:
- Review dashboard KPIs, then open Shipments for active references.
- Track a shipment from the shipment detail page map and status timeline.
- Create a shipment from Shipments → New shipment and confirm route details.
- Upload missing trade documents from Documents when a shipment is on customs hold.

Admin workflows:
- Manage users from the admin users area.
- Review analytics and operational KPIs from the admin dashboard.
- Configure the AI avatar assistant and monitor support usage.

Common tasks:
- Track a shipment: open Shipments, select a reference, or use live tracking on the detail page.
- Create a shipment: Shipments → New shipment; complete origin, destination, cargo, and route steps.
- Fix customs hold: upload missing documents and confirm HS codes and declared values.
- Understand delays: compare ETA, tracking progress, and recent status updates.

FAQ guidance:
- "How do I track a shipment?" → Open Shipments, pick your reference, use the tracking map and status timeline.
- "What does in_transit mean?" → The shipment is en route; tracking shows progress toward the destination.
- "How do I create a shipment?" → Go to Shipments → New, fill origin/destination/cargo, then confirm.
- "Why is my shipment delayed?" → Check status, tracking progress, customs holds, and uploaded documents.

Safety:
- Only describe features listed above.
- If unsure, say you are not sure and guide the user to the relevant dashboard section.
- Keep answers short (2–4 sentences), clear, and actionable.
""".strip()


def build_knowledge_context(*, user_role: str = "", recent_shipments: list | None = None) -> str:
    """Compose assistant context from static knowledge and optional live shipment hints."""
    parts = [PLATFORM_KNOWLEDGE]
    if user_role:
        parts.append(f"Current user role: {user_role}.")
    if recent_shipments:
        parts.append("Recent shipments for this user (use only when relevant):")
        for s in recent_shipments[:5]:
            if not isinstance(s, dict):
                continue
            parts.append(
                "- "
                + ", ".join(
                    f"{k}={v}"
                    for k, v in (
                        ("id", s.get("id")),
                        ("reference", s.get("reference")),
                        ("status", s.get("status")),
                        ("origin", s.get("origin")),
                        ("destination", s.get("destination")),
                    )
                    if v not in (None, "")
                )
            )
    return "\n".join(parts)
