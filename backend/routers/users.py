from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from auth.hashing import hash_password
from database import get_db
from models.user import User, UserRole
from schemas.preferences import NotificationPreferences
from schemas.user import AdminUserUpdate, UserCreate, UserProfileUpdate, UserResponse

router = APIRouter()

_DEFAULT_PREFS = NotificationPreferences().model_dump()


def _merge_prefs(stored: dict | None) -> dict:
    merged = {**_DEFAULT_PREFS}
    if stored:
        merged.update(stored)
    return merged

_admin_only = Depends(require_role(["admin"]))


def _parse_user_role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        allowed = ", ".join(r.value for r in UserRole)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed: {allowed}",
        ) from None


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> list[User]:
    return list(
        db.scalars(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)).all()
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_admin(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=_parse_user_role(payload.role),
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def me(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    current.notification_preferences = _merge_prefs(current.notification_preferences)
    return current


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    if "full_name" in data:
        current.full_name = data["full_name"]
    if "phone" in data:
        current.phone = data["phone"]
    if "notification_preferences" in data and data["notification_preferences"] is not None:
        merged = _merge_prefs(current.notification_preferences)
        merged.update(data["notification_preferences"])
        current.notification_preferences = merged
    db.commit()
    db.refresh(current)
    current.notification_preferences = _merge_prefs(current.notification_preferences)
    return current


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = _admin_only,
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_id == admin.id:
        if data.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account",
            )
        if "role" in data and data["role"] != user.role.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own role",
            )
    if "role" in data:
        user.role = _parse_user_role(data["role"])
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = _admin_only,
) -> None:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
