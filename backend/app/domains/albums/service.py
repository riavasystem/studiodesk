from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.albums.models import Album
from app.domains.albums.schemas import AlbumCreate, AlbumUpdate


def get_album(db: Session, album_id: int) -> Album | None:
    return db.get(Album, album_id)


def list_albums(db: Session, skip: int = 0, limit: int = 50) -> list[Album]:
    return list(db.scalars(select(Album).offset(skip).limit(limit)))


def create_album(db: Session, album_in: AlbumCreate, owner_id: int) -> Album:
    album = Album(**album_in.model_dump(), owner_id=owner_id)
    db.add(album)
    db.commit()
    db.refresh(album)
    return album


def update_album(db: Session, album: Album, album_in: AlbumUpdate) -> Album:
    for field, value in album_in.model_dump().items():
        setattr(album, field, value)
    db.commit()
    db.refresh(album)
    return album


def delete_album(db: Session, album: Album) -> None:
    db.delete(album)
    db.commit()
