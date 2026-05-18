import logging

from auth.action_tokens import PURPOSE_EMAIL_VERIFY, PURPOSE_PASSWORD_RESET, create_action_token
from config import get_settings
from services.email_service import EmailService

logger = logging.getLogger(__name__)


def _frontend_base() -> str:
    return get_settings().frontend_url.rstrip("/")


def _button_html(href: str, label: str) -> str:
    return (
        f'<p style="margin:28px 0">'
        f'<a href="{href}" style="display:inline-block;padding:12px 24px;'
        f'background:#4338ca;color:#fff;text-decoration:none;border-radius:6px;'
        f'font-weight:600">{label}</a></p>'
    )


def _wrap_html(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;font-weight:600">{title}</h1>
  {body_html}
  <p style="margin-top:32px;font-size:12px;color:#666">GlobalTradeX · Trade operations platform</p>
</body></html>"""


def send_verification_email(*, user_id: int, email: str, full_name: str) -> bool:
    settings = get_settings()
    token = create_action_token(
        user_id,
        PURPOSE_EMAIL_VERIFY,
        expires_minutes=settings.email_verify_expire_minutes,
    )
    link = f"{_frontend_base()}/verify-email?token={token}"
    subject = "Verify your GlobalTradeX email"
    plain = (
        f"Hi {full_name},\n\n"
        f"Thanks for joining GlobalTradeX. Confirm your email to sign in:\n{link}\n\n"
        f"This link expires in {settings.email_verify_expire_minutes // 60} hours.\n"
    )
    html = _wrap_html(
        "Confirm your email",
        f"<p>Hi {full_name},</p>"
        f"<p>Thanks for creating your GlobalTradeX workspace. Confirm your email to activate your account.</p>"
        f"{_button_html(link, 'Verify email')}"
        f'<p style="font-size:13px;color:#666">Or copy this link:<br><a href="{link}">{link}</a></p>',
    )
    ok = EmailService().send(email, subject, plain, html=html)
    if not ok:
        logger.warning("Verification email not sent to %s (check SMTP settings)", email)
    return ok


def send_password_reset_email(*, user_id: int, email: str, full_name: str) -> bool:
    settings = get_settings()
    token = create_action_token(
        user_id,
        PURPOSE_PASSWORD_RESET,
        expires_minutes=settings.password_reset_expire_minutes,
    )
    link = f"{_frontend_base()}/reset-password?token={token}"
    subject = "Reset your GlobalTradeX password"
    plain = (
        f"Hi {full_name},\n\n"
        f"We received a request to reset your password. Open this link:\n{link}\n\n"
        f"If you did not request this, you can ignore this email.\n"
        f"The link expires in {settings.password_reset_expire_minutes} minutes.\n"
    )
    html = _wrap_html(
        "Reset your password",
        f"<p>Hi {full_name},</p>"
        f"<p>We received a request to reset your GlobalTradeX password.</p>"
        f"{_button_html(link, 'Reset password')}"
        f'<p style="font-size:13px;color:#666">If you did not request this, ignore this email.</p>',
    )
    ok = EmailService().send(email, subject, plain, html=html)
    if not ok:
        logger.warning("Password reset email not sent to %s (check SMTP settings)", email)
    return ok
