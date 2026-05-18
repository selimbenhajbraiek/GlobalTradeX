import logging
import smtplib
from email.message import EmailMessage

from config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """SMTP email sending (configure via .env)."""

    def __init__(self) -> None:
        self._settings = get_settings()

    def send(self, to_addr: str, subject: str, body: str, html: str | None = None) -> bool:
        if not self._settings.smtp_host:
            logger.warning("SMTP not configured; skipping send to %s", to_addr)
            return False
        msg = EmailMessage()
        msg["Subject"] = subject
        from_addr = self._settings.smtp_from or self._settings.smtp_user or "noreply@localhost"
        msg["From"] = from_addr
        msg["To"] = to_addr
        msg.set_content(body)
        if html:
            msg.add_alternative(html, subtype="html")
        try:
            with smtplib.SMTP(self._settings.smtp_host, self._settings.smtp_port) as smtp:
                smtp.starttls()
                if self._settings.smtp_user and self._settings.smtp_password:
                    smtp.login(self._settings.smtp_user, self._settings.smtp_password)
                smtp.send_message(msg)
            return True
        except OSError as e:
            logger.exception("Email send failed: %s", e)
            return False
