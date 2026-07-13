from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.domains.users.models import User
from app.domains.users.service import get_user_by_email

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No se pudo validar las credenciales",
    headers={"WWW-Authenticate": "Bearer"},
)


def _resolve_user_from_token(token: str | None, db: Session) -> User:
    if token is None:
        raise credentials_exception

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    email = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = get_user_by_email(db, email)
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    return _resolve_user_from_token(token, db)


def get_current_user_header_or_query(
    db: Annotated[Session, Depends(get_db)],
    header_token: Annotated[str | None, Depends(optional_oauth2_scheme)] = None,
    query_token: Annotated[str | None, Query(alias="access_token")] = None,
) -> User:
    """Same as get_current_user, but also accepts the token as a query param.

    Only for endpoints consumed by media elements / audio engines that cannot
    attach an Authorization header (e.g. Tone.js's internal fetch).
    """
    return _resolve_user_from_token(header_token or query_token, db)


def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador",
        )
    return current_user
