from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_superuser, get_current_user
from app.db.session import get_db
from app.domains.users.models import User
from app.domains.users.schemas import UserCreate, UserRead
from app.domains.users.service import create_user, get_user, get_user_by_email, list_users

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]) -> User:
    if get_user_by_email(db, user_in.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este email",
        )
    return create_user(db, user_in)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.get("", response_model=list[UserRead])
def read_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_superuser)],
    skip: int = 0,
    limit: int = 50,
) -> list[User]:
    return list_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_superuser)],
) -> User:
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user
