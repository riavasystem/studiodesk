from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.albums.models import Album
from app.domains.albums.schemas import AlbumCreate, AlbumRead, AlbumUpdate
from app.domains.albums.service import create_album, delete_album, get_album, list_albums, update_album
from app.domains.users.models import User

router = APIRouter(prefix="/albums", tags=["albums"])


def _ensure_owner_or_superuser(album: Album, user: User) -> None:
    if album.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este álbum")


@router.get("", response_model=list[AlbumRead])
def read_albums(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
):
    return list_albums(db, skip=skip, limit=limit)


@router.get("/{album_id}", response_model=AlbumRead)
def read_album(
    album_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    album = get_album(db, album_id)
    if album is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Álbum no encontrado")
    return album


@router.post("", response_model=AlbumRead, status_code=status.HTTP_201_CREATED)
def create_album_endpoint(
    album_in: AlbumCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_album(db, album_in, owner_id=current_user.id)


@router.put("/{album_id}", response_model=AlbumRead)
def update_album_endpoint(
    album_id: int,
    album_in: AlbumUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    album = get_album(db, album_id)
    if album is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Álbum no encontrado")
    _ensure_owner_or_superuser(album, current_user)
    return update_album(db, album, album_in)


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_album_endpoint(
    album_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    album = get_album(db, album_id)
    if album is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Álbum no encontrado")
    _ensure_owner_or_superuser(album, current_user)
    delete_album(db, album)
