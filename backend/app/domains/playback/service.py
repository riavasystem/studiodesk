from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.playback.models import SongMarker
from app.domains.playback.schemas import SongMarkerCreate, SongMarkerUpdate
from app.domains.playback.structure import detect_section_boundaries
from app.domains.storage.service import get_audio_file
from app.domains.tracks.models import Track

AUTO_SECTION_PREFIX = "Sección "
_REFERENCE_TRACK_TYPES = ["guide", "lead_vocal", "backing_vocal", "choir"]
_SECTION_COLORS = ["#38bdf8", "#34d399", "#f97316", "#a78bfa", "#f472b6", "#facc15", "#fb7185", "#22d3ee"]


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


def _pick_reference_track(tracks: list[Track]) -> Track | None:
    for preferred_type in _REFERENCE_TRACK_TYPES:
        match = next((t for t in tracks if t.track_type == preferred_type), None)
        if match is not None:
            return match
    return max(tracks, key=lambda t: t.duration_seconds or 0, default=None)


def auto_detect_markers(db: Session, song_id: int, tracks: list[Track]) -> list[SongMarker]:
    reference = _pick_reference_track(tracks)
    if reference is None:
        raise ValueError("La canción no tiene pistas para analizar")

    audio_file = get_audio_file(db, int(reference.file_path))
    if audio_file is None:
        raise ValueError("No se encontró el archivo de audio de referencia")

    boundaries = detect_section_boundaries(audio_file.storage_path)

    # Clear previously auto-generated sections so re-running doesn't duplicate them;
    # markers the user renamed no longer start with the prefix and are left untouched.
    db.query(SongMarker).filter(
        SongMarker.song_id == song_id, SongMarker.label.startswith(AUTO_SECTION_PREFIX)
    ).delete(synchronize_session=False)

    created: list[SongMarker] = []
    for i, position in enumerate(boundaries):
        marker = SongMarker(
            song_id=song_id,
            label=f"{AUTO_SECTION_PREFIX}{i + 1}",
            marker_type="cue",
            color=_SECTION_COLORS[i % len(_SECTION_COLORS)],
            position_seconds=position,
            order_index=i,
        )
        db.add(marker)
        created.append(marker)

    db.commit()
    for marker in created:
        db.refresh(marker)
    return sorted(created, key=lambda m: m.position_seconds)
