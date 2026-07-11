from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.playlists.models import Playlist, PlaylistSong
from app.domains.playlists.schemas import PlaylistCreate, PlaylistSongCreate, PlaylistUpdate


def get_playlist(db: Session, playlist_id: int) -> Playlist | None:
    return db.get(Playlist, playlist_id)


def list_playlists(db: Session, owner_id: int, skip: int = 0, limit: int = 50) -> list[Playlist]:
    return list(
        db.scalars(select(Playlist).where(Playlist.owner_id == owner_id).offset(skip).limit(limit))
    )


def create_playlist(db: Session, playlist_in: PlaylistCreate, owner_id: int) -> Playlist:
    playlist = Playlist(name=playlist_in.name, owner_id=owner_id)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


def update_playlist(db: Session, playlist: Playlist, playlist_in: PlaylistUpdate) -> Playlist:
    playlist.name = playlist_in.name
    db.commit()
    db.refresh(playlist)
    return playlist


def delete_playlist(db: Session, playlist: Playlist) -> None:
    db.delete(playlist)
    db.commit()


def add_song_to_playlist(db: Session, playlist_id: int, item_in: PlaylistSongCreate) -> PlaylistSong:
    item = PlaylistSong(playlist_id=playlist_id, song_id=item_in.song_id, order_index=item_in.order_index)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_playlist_song(db: Session, item_id: int) -> PlaylistSong | None:
    return db.get(PlaylistSong, item_id)


def remove_song_from_playlist(db: Session, item: PlaylistSong) -> None:
    db.delete(item)
    db.commit()
