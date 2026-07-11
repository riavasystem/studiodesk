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


def delete_audio_file(db: Session, audio_file: AudioFile) -> None:
    path = Path(audio_file.storage_path)
    if path.exists():
        path.unlink()
    db.delete(audio_file)
    db.commit()
