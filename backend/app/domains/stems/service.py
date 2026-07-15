import subprocess
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domains.stems.models import StemJob
from app.domains.storage.service import EXTRACT_SOURCE_EXTENSIONS

ACCEPTED_EXTENSIONS = EXTRACT_SOURCE_EXTENSIONS
MAX_DURATION_SECONDS = 600


def probe_duration_seconds(path: Path) -> float:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            check=True,
            capture_output=True,
            text=True,
        )
        duration = float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError) as exc:
        raise ValueError("No se pudo leer la duración del archivo") from exc

    if duration > MAX_DURATION_SECONDS:
        raise ValueError("La canción es demasiado larga para separar automáticamente (máximo 10 minutos)")
    return duration


async def save_stem_upload(upload: UploadFile, filename: str) -> Path:
    tmp_dir = Path(settings.STORAGE_PATH) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    extension = Path(filename).suffix.lower()
    destination = tmp_dir / f"{uuid.uuid4().hex}{extension}"

    with destination.open("wb") as out_file:
        while chunk := await upload.read(1024 * 1024):
            out_file.write(chunk)

    return destination


def create_stem_job(
    db: Session, owner_id: int, song_id: int, original_filename: str, source_path: Path, duration: float
) -> StemJob:
    job = StemJob(
        owner_id=owner_id,
        song_id=song_id,
        status="pending",
        original_filename=original_filename,
        source_storage_path=str(source_path),
        duration_seconds=duration,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_stem_job(db: Session, job_id: int) -> StemJob | None:
    return db.get(StemJob, job_id)
