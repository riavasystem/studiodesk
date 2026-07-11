from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.tracks.models import Track
from app.domains.tracks.schemas import TrackCreate, TrackUpdate


def get_track(db: Session, track_id: int) -> Track | None:
    return db.get(Track, track_id)


def list_tracks_by_song(db: Session, song_id: int) -> list[Track]:
    return list(db.scalars(select(Track).where(Track.song_id == song_id).order_by(Track.order_index)))


def create_track(db: Session, track_in: TrackCreate) -> Track:
    track = Track(**track_in.model_dump())
    db.add(track)
    db.commit()
    db.refresh(track)
    return track


def update_track(db: Session, track: Track, track_in: TrackUpdate) -> Track:
    for field, value in track_in.model_dump().items():
        setattr(track, field, value)
    db.commit()
    db.refresh(track)
    return track


def delete_track(db: Session, track: Track) -> None:
    db.delete(track)
    db.commit()
