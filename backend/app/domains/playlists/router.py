from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.playlists.models import Playlist
from app.domains.playlists.schemas import (
    PlaylistCreate,
    PlaylistRead,
    PlaylistSongCreate,
    PlaylistSongRead,
    PlaylistUpdate,
)
from app.domains.playlists.service import (
    add_song_to_playlist,
    create_playlist,
    delete_playlist,
    get_playlist,
    get_playlist_song,
    list_playlist_songs,
    list_playlists,
    remove_song_from_playlist,
    update_playlist,
)
from app.domains.users.models import User

router = APIRouter(prefix="/playlists", tags=["playlists"])


def _ensure_owner_or_superuser(playlist: Playlist, user: User) -> None:
    if playlist.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta playlist")


def _get_owned_playlist(db: Session, playlist_id: int, user: User) -> Playlist:
    playlist = get_playlist(db, playlist_id)
    if playlist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist no encontrada")
    _ensure_owner_or_superuser(playlist, user)
    return playlist


@router.get("", response_model=list[PlaylistRead])
def read_playlists(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
):
    return list_playlists(db, owner_id=current_user.id, skip=skip, limit=limit)


@router.get("/{playlist_id}", response_model=PlaylistRead)
def read_playlist(
    playlist_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _get_owned_playlist(db, playlist_id, current_user)


@router.post("", response_model=PlaylistRead, status_code=status.HTTP_201_CREATED)
def create_playlist_endpoint(
    playlist_in: PlaylistCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_playlist(db, playlist_in, owner_id=current_user.id)


@router.put("/{playlist_id}", response_model=PlaylistRead)
def update_playlist_endpoint(
    playlist_id: int,
    playlist_in: PlaylistUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    playlist = _get_owned_playlist(db, playlist_id, current_user)
    return update_playlist(db, playlist, playlist_in)


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist_endpoint(
    playlist_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    playlist = _get_owned_playlist(db, playlist_id, current_user)
    delete_playlist(db, playlist)


@router.get("/{playlist_id}/songs", response_model=list[PlaylistSongRead])
def read_playlist_songs(
    playlist_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_playlist(db, playlist_id, current_user)
    return list_playlist_songs(db, playlist_id)


@router.post("/{playlist_id}/songs", response_model=PlaylistSongRead, status_code=status.HTTP_201_CREATED)
def add_song_endpoint(
    playlist_id: int,
    item_in: PlaylistSongCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_playlist(db, playlist_id, current_user)
    return add_song_to_playlist(db, playlist_id, item_in)


@router.delete("/{playlist_id}/songs/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_song_endpoint(
    playlist_id: int,
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_playlist(db, playlist_id, current_user)
    item = get_playlist_song(db, item_id)
    if item is None or item.playlist_id != playlist_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada en la playlist")
    remove_song_from_playlist(db, item)
