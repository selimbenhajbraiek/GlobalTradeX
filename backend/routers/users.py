from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.user import User, UserRole
from schemas.user import AdminUserUpdate, UserResponse

router = APIRouter()

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
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = _admin_only,
) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit)).all())


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)) -> User:
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
