import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.playback.models import SectionSequenceItem, SongMarker
from app.domains.playback.schemas import SongMarkerCreate, SongMarkerUpdate
from app.domains.playback.structure import detect_section_boundaries
from app.domains.songs.service import get_song
from app.domains.storage.service import get_audio_file
from app.domains.tracks.models import Track

_REFERENCE_TRACK_TYPES = ["guide", "lead_vocal", "backing_vocal", "choir"]
# Evenly spread across the hue wheel so no two colors (including adjacent
# ones, which sit next to each other on the timeline) read as similar.
_SECTION_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"]
# Matches only the labels/types _default_section_names + auto-detect can ever
# produce, so a re-detect can tell "auto-generated" apart from anything the
# user typed themselves (even if they happened to type "Verso 2" by hand,
# that's an acceptable rare false positive — the alternative, a fragile
# static prefix, previously mismatched entirely once labels were translated).
_AUTO_LABEL_RE = re.compile(r"^(Intro|Final|Verso \d+|Coro \d+)$")


def _default_section_names(count: int) -> list[tuple[str, str]]:
    """Spanish (label, marker_type) pairs for `count` auto-detected sections:
    Intro, alternating Verso/Coro in the middle, Final."""
    if count <= 0:
        return []
    if count == 1:
        return [("Intro", "intro")]

    names: list[tuple[str, str]] = [("Intro", "intro")]
    verse_num = 0
    chorus_num = 0
    for i in range(1, count - 1):
        if (i - 1) % 2 == 0:
            verse_num += 1
            names.append((f"Verso {verse_num}", "verse"))
        else:
            chorus_num += 1
            names.append((f"Coro {chorus_num}", "chorus"))
    names.append(("Final", "outro"))
    return names


def get_marker(db: Session, marker_id: int) -> SongMarker | None:
    return db.get(SongMarker, marker_id)


def list_markers_by_song(db: Session, song_id: int) -> list[SongMarker]:
    return list(
        db.scalars(
            select(SongMarker).where(SongMarker.song_id == song_id).order_by(SongMarker.position_seconds)
        )
    )


def _compute_default_end(db: Session, song_id: int, position_seconds: float, exclude_marker_id: int | None) -> float | None:
    """Next marker chronologically after `position_seconds`, else the song's
    known duration, else None (open-ended)."""
    query = select(SongMarker).where(
        SongMarker.song_id == song_id, SongMarker.position_seconds > position_seconds
    )
    if exclude_marker_id is not None:
        query = query.where(SongMarker.id != exclude_marker_id)
    next_marker = db.scalars(query.order_by(SongMarker.position_seconds).limit(1)).first()
    if next_marker is not None:
        return next_marker.position_seconds

    song = get_song(db, song_id)
    return song.duration_seconds if song is not None else None


def create_marker(db: Session, marker_in: SongMarkerCreate) -> SongMarker:
    data = marker_in.model_dump()
    if data.get("end_time_seconds") is None:
        data["end_time_seconds"] = _compute_default_end(db, data["song_id"], data["position_seconds"], None)
    marker = SongMarker(**data)
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker


def update_marker(db: Session, marker: SongMarker, marker_in: SongMarkerUpdate) -> SongMarker:
    data = marker_in.model_dump()
    if data.get("end_time_seconds") is None:
        data["end_time_seconds"] = _compute_default_end(db, marker.song_id, data["position_seconds"], marker.id)
    for field, value in data.items():
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

    boundaries, real_duration = detect_section_boundaries(audio_file.storage_path)

    song = get_song(db, song_id)
    # Bound the last section to where this audio file actually ends, not to
    # `song.duration_seconds` — that stored value can drift stale (e.g. set
    # from a different track at upload time) and let the Final section run
    # past the real end of the reference track's audio.
    fallback_end = real_duration
    if song is not None and (song.duration_seconds is None or abs(song.duration_seconds - real_duration) > 0.5):
        song.duration_seconds = real_duration

    # Clear previously auto-generated sections so re-running doesn't duplicate
    # them; markers the user renamed to something else are left untouched.
    existing = list_markers_by_song(db, song_id)
    for marker in existing:
        if _AUTO_LABEL_RE.match(marker.label):
            db.delete(marker)

    # A re-detect invalidates any custom sequence the user had built (repeats/reorders
    # referencing markers that may no longer exist) — wipe it so the next read
    # regenerates a fresh chronological default from the newly detected markers.
    db.query(SectionSequenceItem).filter(SectionSequenceItem.song_id == song_id).delete(synchronize_session=False)

    names = _default_section_names(len(boundaries))
    created: list[SongMarker] = []
    for i, position in enumerate(boundaries):
        end_time = boundaries[i + 1] if i + 1 < len(boundaries) else fallback_end
        label, marker_type = names[i]
        marker = SongMarker(
            song_id=song_id,
            label=label,
            marker_type=marker_type,
            color=_SECTION_COLORS[i % len(_SECTION_COLORS)],
            position_seconds=position,
            end_time_seconds=end_time,
            order_index=i,
        )
        db.add(marker)
        created.append(marker)

    db.commit()
    for marker in created:
        db.refresh(marker)
    return sorted(created, key=lambda m: m.position_seconds)


# --- Playback sequence -------------------------------------------------


def list_sequence_items(db: Session, song_id: int) -> list[SectionSequenceItem]:
    return list(
        db.scalars(
            select(SectionSequenceItem)
            .where(SectionSequenceItem.song_id == song_id)
            .order_by(SectionSequenceItem.order_index)
        )
    )


def ensure_default_sequence(db: Session, song_id: int) -> list[SectionSequenceItem]:
    existing = list_sequence_items(db, song_id)
    if existing:
        return existing

    markers = list_markers_by_song(db, song_id)
    if not markers:
        return []

    items = [
        SectionSequenceItem(song_id=song_id, marker_id=marker.id, order_index=i)
        for i, marker in enumerate(markers)
    ]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)
    return items


def get_sequence_item(db: Session, item_id: int) -> SectionSequenceItem | None:
    return db.get(SectionSequenceItem, item_id)


def _renumber(db: Session, song_id: int) -> None:
    items = list(
        db.scalars(
            select(SectionSequenceItem)
            .where(SectionSequenceItem.song_id == song_id)
            .order_by(SectionSequenceItem.order_index, SectionSequenceItem.id)
        )
    )
    for i, item in enumerate(items):
        item.order_index = i


def append_sequence_item(db: Session, song_id: int, marker_id: int, order_index: int | None) -> SectionSequenceItem:
    current = ensure_default_sequence(db, song_id)
    target_index = order_index if order_index is not None else len(current)
    target_index = max(0, min(target_index, len(current)))

    item = SectionSequenceItem(song_id=song_id, marker_id=marker_id, order_index=target_index)
    db.add(item)
    db.flush()

    # Splice the new item into the existing order explicitly instead of
    # re-sorting by (order_index, id): a tie on order_index would fall back to
    # primary key and put pre-existing rows ahead of the one just inserted,
    # silently pushing "insert after X" toward the end of the sequence.
    ordered_ids = [existing.id for existing in current]
    ordered_ids.insert(target_index, item.id)
    for index, item_id in enumerate(ordered_ids):
        db.get(SectionSequenceItem, item_id).order_index = index

    db.commit()
    db.refresh(item)
    return item


def remove_sequence_item(db: Session, item: SectionSequenceItem) -> None:
    song_id = item.song_id
    db.delete(item)
    db.flush()
    _renumber(db, song_id)
    db.commit()


def reorder_sequence(db: Session, song_id: int, item_ids: list[int]) -> list[SectionSequenceItem]:
    items_by_id = {item.id: item for item in list_sequence_items(db, song_id)}
    if set(item_ids) != set(items_by_id):
        raise ValueError("La lista de reordenamiento no coincide con los elementos de la secuencia")

    for index, item_id in enumerate(item_ids):
        items_by_id[item_id].order_index = index
    db.commit()
    return list_sequence_items(db, song_id)
