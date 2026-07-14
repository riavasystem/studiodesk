import os
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.domains.imports.models import ImportJob
from app.domains.songs.models import Song
from app.domains.storage.models import AudioFile
from app.domains.tracks.models import Track

AUDIO_EXTENSIONS = {".wav", ".mp3"}
MIME_TYPES = {".wav": "audio/wav", ".mp3": "audio/mpeg"}
MAX_EXTRACT_WORKERS = max(1, min(4, os.cpu_count() or 1))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_MIME_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
COVER_KEYWORDS = ["cover", "portada", "artwork", "folder", "front"]

ORDER_PRIORITY = [
    "click",
    "guide",
    "kick",
    "snare",
    "hihat",
    "drums",
    "percussion",
    "bass",
    "guitar_acoustic",
    "guitar_electric",
    "piano",
    "pad",
    "strings",
    "brass",
    "choir",
    "backing_vocal",
    "lead_vocal",
    "fx",
    "loops",
    "midi",
    "narration",
    "other",
]

TRACK_TYPE_COLORS = {
    "click": "#9ca3af",
    "guide": "#6b7280",
    "kick": "#ef4444",
    "snare": "#f97316",
    "hihat": "#f59e0b",
    "drums": "#f97316",
    "percussion": "#eab308",
    "bass": "#a855f7",
    "guitar_acoustic": "#22c55e",
    "guitar_electric": "#16a34a",
    "piano": "#0ea5e9",
    "pad": "#38bdf8",
    "strings": "#6366f1",
    "brass": "#eab308",
    "choir": "#ec4899",
    "backing_vocal": "#f472b6",
    "lead_vocal": "#ff8a1f",
    "fx": "#14b8a6",
    "loops": "#06b6d4",
    "midi": "#8b5cf6",
    "narration": "#94a3b8",
    "other": "#ff8a1f",
}

# Ordered most-specific-first: the first matching keyword wins.
_KEYWORD_RULES: list[tuple[str, list[str]]] = [
    ("click", ["click", "clic", "metronomo", "metrónomo", "count"]),
    ("guide", ["guide", "guia", "guía", "cue"]),
    ("backing_vocal", ["backing", "coros", "coro"]),
    ("choir", ["choir"]),
    ("lead_vocal", ["lead vocal", "leadvocal", "voz principal", "vocal principal", "lead", "vocal", "voz"]),
    ("narration", ["narrat", "narracion", "narración"]),
    ("kick", ["kick", "bombo"]),
    ("snare", ["snare", "caja"]),
    ("hihat", ["hihat", "hi-hat", "hi hat", "hh"]),
    ("drums", ["drum", "bateria", "batería"]),
    ("percussion", ["perc", "conga", "timbal"]),
    ("bass", ["bass", "bajo"]),
    (
        "guitar_acoustic",
        ["acoustic guitar", "guitarra acustica", "guitarra acústica", "guitar ac", "gtr ac"],
    ),
    ("guitar_electric", ["guitar", "guitarra", "gtr"]),
    ("piano", ["piano", "keys", "teclado"]),
    ("pad", ["pad"]),
    ("strings", ["string", "cuerdas"]),
    ("brass", ["brass", "metales", "trumpet", "trombone", "sax"]),
    ("fx", ["fx", "efecto"]),
    ("loops", ["loop"]),
    ("midi", ["midi", "secuencia"]),
]


def classify_track_type(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for track_type, keywords in _KEYWORD_RULES:
        if any(keyword in stem for keyword in keywords):
            return track_type
    return "other"


def is_audio_entry(info: zipfile.ZipInfo) -> bool:
    if info.is_dir():
        return False
    name = Path(info.filename)
    if "__MACOSX" in info.filename or name.name.startswith("."):
        return False
    return name.suffix.lower() in AUDIO_EXTENSIONS


def is_image_entry(info: zipfile.ZipInfo) -> bool:
    if info.is_dir():
        return False
    name = Path(info.filename)
    if "__MACOSX" in info.filename or name.name.startswith("."):
        return False
    return name.suffix.lower() in IMAGE_EXTENSIONS


def _pick_cover_entry(entries: list[zipfile.ZipInfo]) -> zipfile.ZipInfo | None:
    if not entries:
        return None
    named = [e for e in entries if any(k in Path(e.filename).stem.lower() for k in COVER_KEYWORDS)]
    pool = named or entries
    return min(pool, key=lambda e: e.filename)


def extract_duration_seconds(path: Path) -> float | None:
    try:
        import mutagen

        audio = mutagen.File(path)
        if audio is not None and audio.info is not None:
            return float(audio.info.length)
    except Exception:
        return None
    return None


async def save_zip_upload(upload_stream, filename: str) -> tuple[Path, int]:
    imports_dir = Path(settings.STORAGE_PATH) / "imports"
    imports_dir.mkdir(parents=True, exist_ok=True)
    destination = imports_dir / f"{uuid.uuid4().hex}.zip"

    size_bytes = 0
    with destination.open("wb") as out_file:
        while chunk := await upload_stream.read(1024 * 1024):
            size_bytes += len(chunk)
            out_file.write(chunk)

    return destination, size_bytes


def create_song_and_job(
    db: Session, owner_id: int, artist: str, original_filename: str, zip_path: Path
) -> ImportJob:
    title = Path(original_filename).stem
    song = Song(title=title, artist=artist or "Sin artista", owner_id=owner_id)
    db.add(song)
    db.flush()

    job = ImportJob(
        owner_id=owner_id,
        song_id=song.id,
        status="pending",
        original_filename=original_filename,
        zip_storage_path=str(zip_path),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_import_job(db: Session, job_id: int) -> ImportJob | None:
    return db.get(ImportJob, job_id)


def _extract_track_file(zip_path: str, audio_dir: Path, archive_name: str, filename: str) -> tuple[Path, int, float | None]:
    """Runs in a worker thread: each call opens its own ZipFile handle since
    zipfile.ZipFile is not safe to share across threads."""
    extension = Path(filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = audio_dir / stored_filename

    with zipfile.ZipFile(zip_path) as zf, zf.open(archive_name) as src, destination.open("wb") as out:
        while chunk := src.read(1024 * 1024):
            out.write(chunk)

    duration = extract_duration_seconds(destination)
    return destination, destination.stat().st_size, duration


def process_zip_import(job_id: int) -> None:
    db = SessionLocal()
    job: ImportJob | None = None
    try:
        job = db.get(ImportJob, job_id)
        if job is None:
            return
        job.status = "processing"
        db.commit()

        audio_dir = Path(settings.STORAGE_PATH) / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(job.zip_storage_path) as zf:
            entries = [info for info in zf.infolist() if is_audio_entry(info)]
            image_entries = [info for info in zf.infolist() if is_image_entry(info)]
        if not entries:
            raise ValueError("El ZIP no contiene archivos de audio válidos (.wav o .mp3)")

        job.total_files = len(entries)
        db.commit()

        planned = [(info.filename, Path(info.filename).name, classify_track_type(info.filename)) for info in entries]
        planned.sort(
            key=lambda item: (
                ORDER_PRIORITY.index(item[2]) if item[2] in ORDER_PRIORITY else len(ORDER_PRIORITY),
                item[1].lower(),
            )
        )

        # Decompression + disk writes + duration probing run in parallel across
        # up to MAX_EXTRACT_WORKERS threads (each with its own ZipFile handle),
        # since that's the CPU/IO-heavy part. DB writes stay single-threaded.
        extracted: list[tuple[Path, int, float | None] | None] = [None] * len(planned)
        with ThreadPoolExecutor(max_workers=MAX_EXTRACT_WORKERS) as executor:
            future_to_index = {
                executor.submit(_extract_track_file, job.zip_storage_path, audio_dir, archive_name, filename): i
                for i, (archive_name, filename, _track_type) in enumerate(planned)
            }
            completed = 0
            for future in as_completed(future_to_index):
                index = future_to_index[future]
                extracted[index] = future.result()
                completed += 1
                job.processed_files = completed
                db.commit()

        for order_index, (_archive_name, filename, track_type) in enumerate(planned):
            result = extracted[order_index]
            assert result is not None
            destination, size_bytes, duration = result
            extension = Path(filename).suffix.lower()

            audio_file = AudioFile(
                original_filename=filename,
                storage_path=str(destination),
                mime_type=MIME_TYPES.get(extension, "application/octet-stream"),
                size_bytes=size_bytes,
                uploaded_by_id=job.owner_id,
            )
            db.add(audio_file)
            db.flush()

            track = Track(
                song_id=job.song_id,
                name=Path(filename).stem,
                file_path=str(audio_file.id),
                order_index=order_index,
                track_type=track_type,
                color=TRACK_TYPE_COLORS.get(track_type, "#ff8a1f"),
                duration_seconds=duration,
            )
            db.add(track)
        db.commit()

        song = db.get(Song, job.song_id)

        max_duration = db.scalar(select(func.max(Track.duration_seconds)).where(Track.song_id == job.song_id))
        if max_duration and song is not None:
            song.duration_seconds = max_duration

        cover_entry = _pick_cover_entry(image_entries)
        if cover_entry is not None and song is not None:
            covers_dir = Path(settings.STORAGE_PATH) / "covers"
            covers_dir.mkdir(parents=True, exist_ok=True)
            extension = Path(cover_entry.filename).suffix.lower()
            cover_filename = f"{uuid.uuid4().hex}{extension}"
            cover_destination = covers_dir / cover_filename

            with zipfile.ZipFile(job.zip_storage_path) as zf, zf.open(cover_entry) as src, cover_destination.open(
                "wb"
            ) as out:
                while chunk := src.read(1024 * 1024):
                    out.write(chunk)

            cover_file = AudioFile(
                original_filename=Path(cover_entry.filename).name,
                storage_path=str(cover_destination),
                mime_type=IMAGE_MIME_TYPES.get(extension, "application/octet-stream"),
                size_bytes=cover_destination.stat().st_size,
                uploaded_by_id=job.owner_id,
            )
            db.add(cover_file)
            db.flush()
            song.cover_image_url = str(cover_file.id)

        job.status = "completed"
        db.commit()
    except Exception as exc:
        db.rollback()
        if job is not None:
            job = db.get(ImportJob, job_id)
            if job is not None:
                job.status = "failed"
                job.error_message = str(exc)[:1000]
                db.commit()
    finally:
        if job is not None:
            zip_path = Path(job.zip_storage_path)
            if zip_path.exists():
                zip_path.unlink()
        db.close()
