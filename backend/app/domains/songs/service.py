from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.songs.models import Song
from app.domains.songs.schemas import SongCreate, SongUpdate


def get_song(db: Session, song_id: int) -> Song | None:
    return db.get(Song, song_id)


def list_songs(db: Session, skip: int = 0, limit: int = 50) -> list[Song]:
    return list(db.scalars(select(Song).offset(skip).limit(limit)))


def create_song(db: Session, song_in: SongCreate, owner_id: int) -> Song:
    song = Song(**song_in.model_dump(), owner_id=owner_id)
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


def update_song(db: Session, song: Song, song_in: SongUpdate) -> Song:
    for field, value in song_in.model_dump().items():
        setattr(song, field, value)
    db.commit()
    db.refresh(song)
    return song


def delete_song(db: Session, song: Song) -> None:
    db.delete(song)
    db.commit()
