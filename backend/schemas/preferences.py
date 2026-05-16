from pydantic import BaseModel, Field


class NotificationPreferences(BaseModel):
    email_digest: bool = True
    shipment_alerts: bool = True
    customs_alerts: bool = True
    ai_summaries: bool = True


class NotificationPreferencesUpdate(BaseModel):
    email_digest: bool | None = None
    shipment_alerts: bool | None = None
    customs_alerts: bool | None = None
    ai_summaries: bool | None = None
