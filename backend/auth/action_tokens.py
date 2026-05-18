from fastapi import HTTPException, status

from auth.jwt import create_access_token, decode_token

PURPOSE_EMAIL_VERIFY = "email_verify"
PURPOSE_PASSWORD_RESET = "password_reset"


def create_action_token(user_id: int, purpose: str, *, expires_minutes: int) -> str:
    return create_access_token(
        {"sub": str(user_id), "purpose": purpose},
        expires_minutes=expires_minutes,
    )


def user_id_from_action_token(token: str, expected_purpose: str) -> int:
    payload = decode_token(token)
    if payload.get("purpose") != expected_purpose:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired link",
        )
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired link",
        ) from e
