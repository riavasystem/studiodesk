from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.playback.models import SongMarker
from app.domains.playback.schemas import SongMarkerCreate, SongMarkerUpdate


def get_marker(db: Session, marker_id: int) -> SongMarker | None:
    return db.get(SongMarker, marker_id)


def list_markers_by_song(db: Session, song_id: int) -> list[SongMarker]:
    return list(
        db.scalars(
            select(SongMarker).where(SongMarker.song_id == song_id).order_by(SongMarker.position_seconds)
        )
    )


def create_marker(db: Session, marker_in: SongMarkerCreate) -> SongMarker:
    marker = SongMarker(**marker_in.model_dump())
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker


def update_marker(db: Session, marker: SongMarker, marker_in: SongMarkerUpdate) -> SongMarker:
    for field, value in marker_in.model_dump().items():
        setattr(marker, field, value)
    db.commit()
    db.refresh(marker)
    return marker


def delete_marker(db: Session, marker: SongMarker) -> None:
    db.delete(marker)
    db.commit()
