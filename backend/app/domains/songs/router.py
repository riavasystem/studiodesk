from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.songs.models import Song
from app.domains.songs.schemas import SongCreate, SongRead, SongUpdate
from app.domains.songs.service import create_song, delete_song, get_song, list_songs, update_song
from app.domains.users.models import User

router = APIRouter(prefix="/songs", tags=["songs"])


def _ensure_owner_or_superuser(song: Song, user: User) -> None:
    if song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta canción")


@router.get("", response_model=list[SongRead])
def read_songs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
):
    return list_songs(db, skip=skip, limit=limit)


@router.get("/{song_id}", response_model=SongRead)
def read_song(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    return song


@router.post("", response_model=SongRead, status_code=status.HTTP_201_CREATED)
def create_song_endpoint(
    song_in: SongCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_song(db, song_in, owner_id=current_user.id)


@router.put("/{song_id}", response_model=SongRead)
def update_song_endpoint(
    song_id: int,
    song_in: SongUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    _ensure_owner_or_superuser(song, current_user)
    return update_song(db, song, song_in)


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song_endpoint(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    _ensure_owner_or_superuser(song, current_user)
    delete_song(db, song)
