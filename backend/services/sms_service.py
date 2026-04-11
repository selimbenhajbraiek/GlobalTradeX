import logging

from config import get_settings

logger = logging.getLogger(__name__)


class SMSService:
    """SMS gateway placeholder (wire Twilio or similar using SMS_API_KEY)."""

    def __init__(self) -> None:
        self._settings = get_settings()

    def send(self, phone_e164: str, message: str) -> bool:
        if not self._settings.sms_api_key:
            logger.warning("SMS not configured; would send to %s", phone_e164)
            return False
        # Integrate provider here
        return True
