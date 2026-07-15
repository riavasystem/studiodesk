"""Standalone process (NOT part of the FastAPI app) that polls stem_jobs and
runs Demucs separation one job at a time. Runs under its own venv
(shared/venv-worker) that has torch+demucs installed, kept out of the API's
venv so the API's deploy/startup never pays that cost.

Invoked as: python -m app.worker.stem_worker
"""

import logging
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.domains.imports.service import TRACK_TYPE_COLORS
from app.domains.songs.models import Song  # noqa: F401 (registers FK target for StemJob.song_id)
from app.domains.stems.models import StemJob
from app.domains.storage.models import AudioFile
from app.domains.tracks.models import Track
from app.domains.users.models import User  # noqa: F401 (registers FK target for StemJob.owner_id)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("stem_worker")

POLL_INTERVAL_SECONDS = 5
DEMUCS_TIMEOUT_SECONDS = 1800

STEM_TRACK_TYPES = {
    "vocals": "lead_vocal",
    "drums": "drums",
    "bass": "bass",
    "other": "other",
}
STEM_NAMES = {
    "vocals": "Voces",
    "drums": "Batería",
    "bass": "Bajo",
    "other": "Otros instrumentos",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def recover_orphaned_jobs() -> None:
    """If the worker crashed mid-job, that job is stuck in converting/processing
    forever with no live worker to finish it. Runs once at boot."""
    db = SessionLocal()
    try:
        stuck = db.scalars(select(StemJob).where(StemJob.status.in_(["converting", "processing"]))).all()
        for job in stuck:
            job.status = "failed"
            job.error_message = "El proceso se interrumpió inesperadamente, intenta de nuevo"
            job.finished_at = _now()
        if stuck:
            db.commit()
            logger.info("Recovered %d orphaned job(s)", len(stuck))
    finally:
        db.close()


def claim_next_pending_job() -> int | None:
    db = SessionLocal()
    try:
        job = db.execute(
            select(StemJob).where(StemJob.status == "pending").order_by(StemJob.created_at).limit(1).with_for_update()
        ).scalar_one_or_none()
        if job is None:
            return None
        job.status = "converting"
        job.started_at = _now()
        db.commit()
        return job.id
    finally:
        db.close()


def ensure_mp3(source_path: Path) -> Path:
    if source_path.suffix.lower() == ".mp3":
        return source_path

    tmp_dir = Path(settings.STORAGE_PATH) / "tmp"
    mp3_path = tmp_dir / f"{uuid.uuid4().hex}.mp3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-i", str(source_path),
            "-vn", "-acodec", "libmp3lame", "-q:a", "2",
            str(mp3_path),
        ],
        check=True,
        capture_output=True,
    )
    return mp3_path


def run_job(job_id: int) -> None:
    db = SessionLocal()
    job: StemJob | None = None
    output_dir: Path | None = None
    mp3_path: Path | None = None
    try:
        job = db.get(StemJob, job_id)
        if job is None:
            return
        source_path = Path(job.source_storage_path)

        mp3_path = ensure_mp3(source_path)

        job.status = "processing"
        db.commit()

        output_dir = Path(settings.STORAGE_PATH) / "tmp" / f"demucs_{job.id}"
        subprocess.run(
            [
                sys.executable, "-m", "demucs",
                "-n", "htdemucs",
                "--mp3",
                "-o", str(output_dir),
                str(mp3_path),
            ],
            check=True,
            capture_output=True,
            timeout=DEMUCS_TIMEOUT_SECONDS,
        )

        stems_dir = output_dir / "htdemucs" / mp3_path.stem
        audio_dir = Path(settings.STORAGE_PATH) / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        for order_index, (stem_name, track_type) in enumerate(STEM_TRACK_TYPES.items()):
            stem_file = stems_dir / f"{stem_name}.mp3"
            dest = audio_dir / f"{uuid.uuid4().hex}.mp3"
            shutil.move(str(stem_file), str(dest))

            audio_file = AudioFile(
                original_filename=f"{Path(job.original_filename).stem} - {STEM_NAMES[stem_name]}.mp3",
                storage_path=str(dest),
                mime_type="audio/mpeg",
                size_bytes=dest.stat().st_size,
                uploaded_by_id=job.owner_id,
            )
            db.add(audio_file)
            db.flush()

            db.add(
                Track(
                    song_id=job.song_id,
                    name=STEM_NAMES[stem_name],
                    file_path=str(audio_file.id),
                    order_index=order_index,
                    track_type=track_type,
                    color=TRACK_TYPE_COLORS.get(track_type, "#ff8a1f"),
                    duration_seconds=job.duration_seconds,
                )
            )
            job.stems_created = order_index + 1
            db.commit()

        job.status = "completed"
        job.finished_at = _now()
        db.commit()
        logger.info("Job %d completed", job_id)
    except Exception as exc:
        db.rollback()
        job = db.get(StemJob, job_id)
        if job is not None:
            job.status = "failed"
            job.error_message = str(exc)[:1000]
            job.finished_at = _now()
            db.commit()
        logger.exception("Job %d failed", job_id)
    finally:
        source_path = Path(job.source_storage_path) if job is not None else None
        if source_path is not None:
            source_path.unlink(missing_ok=True)
        if mp3_path is not None and mp3_path != source_path:
            mp3_path.unlink(missing_ok=True)
        if output_dir is not None:
            shutil.rmtree(output_dir, ignore_errors=True)
        db.close()


def main() -> None:
    logger.info("stem worker starting")
    recover_orphaned_jobs()
    while True:
        job_id = claim_next_pending_job()
        if job_id is None:
            time.sleep(POLL_INTERVAL_SECONDS)
            continue
        run_job(job_id)


if __name__ == "__main__":
    main()
