import base64
import logging
import urllib.parse
import urllib.request

from config import get_settings

logger = logging.getLogger(__name__)


class SMSService:
    """SMS via Twilio REST API when configured; otherwise logs / no-op."""

    def __init__(self) -> None:
        self._settings = get_settings()

    def _try_twilio(self, phone_e164: str, message: str) -> bool:
        sid = (self._settings.twilio_account_sid or "").strip()
        token = (self._settings.twilio_auth_token or "").strip()
        from_num = (self._settings.twilio_from_number or "").strip()
        if not sid or not token or not from_num:
            return False
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        body = urllib.parse.urlencode(
            {"To": phone_e164, "From": from_num, "Body": message[:1600]}
        ).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic "
                + base64.b64encode(f"{sid}:{token}".encode("utf-8")).decode("ascii"),
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return 200 <= resp.status < 300
        except OSError as e:
            logger.exception("Twilio SMS failed: %s", e)
            return False

    def send(self, phone_e164: str, message: str) -> bool:
        if self._try_twilio(phone_e164, message):
            return True
        if self._settings.sms_api_key:
            logger.warning("SMS: Twilio not fully configured; would send to %s", phone_e164)
            return False
        logger.warning("SMS not configured; would send to %s", phone_e164)
        return False
