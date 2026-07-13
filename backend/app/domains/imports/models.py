from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TimestampedBase

IMPORT_STATUSES = {"pending", "processing", "completed", "failed"}


class ImportJob(TimestampedBase):
    __tablename__ = "import_jobs"

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    song_id: Mapped[int | None] = mapped_column(
        ForeignKey("songs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    zip_storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    total_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
