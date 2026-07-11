from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.domains.users.models import User
from app.domains.users.schemas import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def list_users(db: Session, skip: int = 0, limit: int = 50) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit)))


def create_user(db: Session, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
