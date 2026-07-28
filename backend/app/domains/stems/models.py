from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TimestampedBase

STEM_JOB_STATUSES = {"pending", "converting", "processing", "completed", "failed"}


class StemJob(TimestampedBase):
    __tablename__ = "stem_jobs"

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # "separate": full upload + Demucs stem-separation pipeline (default,
    # pre-existing behavior). "detect_bpm": lightweight re-detection of
    # tempo/beat-phase for a song that already has tracks — runs librosa on
    # one of its existing stems instead of an uploaded file, skips Demucs
    # entirely, and must NOT delete source_storage_path on cleanup since that
    # points at a real Track's audio file, not a temp upload.
    job_type: Mapped[str] = mapped_column(String(20), default="separate", server_default="separate", nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    stems_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
