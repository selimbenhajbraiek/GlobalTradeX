from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user
from models.user import User
from schemas.user import UserResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit)).all())


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)) -> User:
    return current
