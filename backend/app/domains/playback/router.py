from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.playback.models import SongMarker
from app.domains.playback.schemas import SongMarkerCreate, SongMarkerRead, SongMarkerUpdate
from app.domains.playback.service import (
    auto_detect_markers,
    create_marker,
    delete_marker,
    get_marker,
    list_markers_by_song,
    update_marker,
)
from app.domains.songs.service import get_song
from app.domains.tracks.service import list_tracks_by_song
from app.domains.users.models import User

router = APIRouter(prefix="/playback", tags=["playback"])


def _ensure_song_owner_or_superuser(db: Session, song_id: int, user: User) -> None:
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    if song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta canción")


def _ensure_marker_owner_or_superuser(marker: SongMarker, user: User) -> None:
    if marker.song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este marcador")


@router.get("/markers", response_model=list[SongMarkerRead])
def read_markers(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return list_markers_by_song(db, song_id)


@router.post("/markers", response_model=SongMarkerRead, status_code=status.HTTP_201_CREATED)
def create_marker_endpoint(
    marker_in: SongMarkerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_song_owner_or_superuser(db, marker_in.song_id, current_user)
    return create_marker(db, marker_in)


@router.post("/markers/auto-detect", response_model=list[SongMarkerRead])
def auto_detect_markers_endpoint(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_song_owner_or_superuser(db, song_id, current_user)
    tracks = list_tracks_by_song(db, song_id)
    try:
        return auto_detect_markers(db, song_id, tracks)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo analizar el audio"
        ) from exc


@router.put("/markers/{marker_id}", response_model=SongMarkerRead)
def update_marker_endpoint(
    marker_id: int,
    marker_in: SongMarkerUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    marker = get_marker(db, marker_id)
    if marker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marcador no encontrado")
    _ensure_marker_owner_or_superuser(marker, current_user)
    return update_marker(db, marker, marker_in)


@router.delete("/markers/{marker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marker_endpoint(
    marker_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    marker = get_marker(db, marker_id)
    if marker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marcador no encontrado")
    _ensure_marker_owner_or_superuser(marker, current_user)
    delete_marker(db, marker)
