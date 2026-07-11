from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.songs.service import get_song
from app.domains.tracks.models import Track
from app.domains.tracks.schemas import TrackCreate, TrackRead, TrackUpdate
from app.domains.tracks.service import create_track, delete_track, get_track, list_tracks_by_song, update_track
from app.domains.users.models import User

router = APIRouter(prefix="/tracks", tags=["tracks"])


def _ensure_song_owner_or_superuser(db: Session, song_id: int, user: User) -> None:
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    if song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta canción")


def _ensure_track_owner_or_superuser(track: Track, user: User) -> None:
    if track.song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta pista")


@router.get("", response_model=list[TrackRead])
def read_tracks(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return list_tracks_by_song(db, song_id)


@router.post("", response_model=TrackRead, status_code=status.HTTP_201_CREATED)
def create_track_endpoint(
    track_in: TrackCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_song_owner_or_superuser(db, track_in.song_id, current_user)
    return create_track(db, track_in)


@router.put("/{track_id}", response_model=TrackRead)
def update_track_endpoint(
    track_id: int,
    track_in: TrackUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    track = get_track(db, track_id)
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pista no encontrada")
    _ensure_track_owner_or_superuser(track, current_user)
    return update_track(db, track, track_in)


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_track_endpoint(
    track_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    track = get_track(db, track_id)
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pista no encontrada")
    _ensure_track_owner_or_superuser(track, current_user)
    delete_track(db, track)
