from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.action_tokens import (
    PURPOSE_EMAIL_VERIFY,
    PURPOSE_PASSWORD_RESET,
    user_id_from_action_token,
)
from auth.hashing import hash_password, verify_password
from auth.jwt import create_access_token
from database import get_db
from models.user import User, UserRole
from schemas.auth_email import (
    ForgotPasswordRequest,
    MessageResponse,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from schemas.user import Token, UserCreate, UserResponse
from services.auth_email import send_password_reset_email, send_verification_email

router = APIRouter()

_GENERIC_RESET_MSG = "If an account exists for that email, we sent password reset instructions."
_GENERIC_RESEND_MSG = "If an account exists and is not verified, we sent a new confirmation email."


def _parse_role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        allowed = ", ".join(r.value for r in UserRole)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed: {allowed}",
        ) from None


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> RegisterResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=_parse_role(payload.role),
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    send_verification_email(user_id=user.id, email=user.email, full_name=user.full_name)
    return RegisterResponse(
        message="Account created. Check your email to verify your address before signing in.",
        email=user.email,
        requires_verification=True,
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user_id = user_id_from_action_token(payload.token, PURPOSE_EMAIL_VERIFY)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.email_verified:
        return MessageResponse(message="Email is already verified. You can sign in.")
    user.email_verified = True
    db.commit()
    return MessageResponse(message="Email verified successfully. You can now sign in.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user and user.is_active and not user.email_verified:
        send_verification_email(user_id=user.id, email=user.email, full_name=user.full_name)
    return MessageResponse(message=_GENERIC_RESEND_MSG)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user and user.is_active:
        send_password_reset_email(user_id=user.id, email=user.email, full_name=user.full_name)
    return MessageResponse(message=_GENERIC_RESET_MSG)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user_id = user_id_from_action_token(payload.token, PURPOSE_PASSWORD_RESET)
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password updated. You can sign in with your new password.")


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
) -> Token:
    user = db.scalar(select(User).where(User.email == form_data.username))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Check your inbox or request a new verification link.",
        )
    access_token = create_access_token(
        {"sub": str(user.id), "role": user.role.value},
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
