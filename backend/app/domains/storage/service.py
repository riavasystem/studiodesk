import subprocess
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domains.storage.models import AudioFile

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".aiff", ".aif", ".ogg", ".m4a"}
ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/flac",
    "audio/aiff",
    "audio/x-aiff",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
}

EXTRACT_SOURCE_EXTENSIONS = ALLOWED_EXTENSIONS | {".mp4", ".mov", ".mkv", ".webm", ".avi"}


def get_audio_file(db: Session, file_id: int) -> AudioFile | None:
    return db.get(AudioFile, file_id)


async def save_audio_file(db: Session, upload: UploadFile, uploaded_by_id: int) -> AudioFile:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS or upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Formato de audio no soportado")

    storage_dir = Path(settings.STORAGE_PATH) / "audio"
    storage_dir.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = storage_dir / stored_filename

    size_bytes = 0
    with destination.open("wb") as out_file:
        while chunk := await upload.read(1024 * 1024):
            size_bytes += len(chunk)
            out_file.write(chunk)

    audio_file = AudioFile(
        original_filename=upload.filename or stored_filename,
        storage_path=str(destination),
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        uploaded_by_id=uploaded_by_id,
    )
    db.add(audio_file)
    db.commit()
    db.refresh(audio_file)
    return audio_file


def save_and_extract_audio(db: Session, upload: UploadFile, uploaded_by_id: int) -> AudioFile:
    """Accepts an audio OR video container (e.g. the .mp4 YouTube Studio hands
    out for your own uploaded videos) and stores only the extracted audio
    track as mp3. No download/scraping happens here — the caller already has
    the file locally; this just transcodes what they hand us."""
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in EXTRACT_SOURCE_EXTENSIONS:
        raise ValueError("Formato no soportado")

    tmp_dir = Path(settings.STORAGE_PATH) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}{extension}"

    with tmp_path.open("wb") as out_file:
        while chunk := upload.file.read(1024 * 1024):
            out_file.write(chunk)

    storage_dir = Path(settings.STORAGE_PATH) / "audio"
    storage_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}.mp3"
    destination = storage_dir / stored_filename

    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", str(tmp_path),
                "-vn", "-acodec", "libmp3lame", "-q:a", "2",
                str(destination),
            ],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        raise ValueError("No se pudo extraer el audio del archivo") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    audio_file = AudioFile(
        original_filename=f"{Path(upload.filename or stored_filename).stem}.mp3",
        storage_path=str(destination),
        mime_type="audio/mpeg",
        size_bytes=destination.stat().st_size,
        uploaded_by_id=uploaded_by_id,
    )
    db.add(audio_file)
    db.commit()
    db.refresh(audio_file)
    return audio_file


def delete_audio_file(db: Session, audio_file: AudioFile) -> None:
    path = Path(audio_file.storage_path)
    if path.exists():
        path.unlink()
    db.delete(audio_file)
    db.commit()
