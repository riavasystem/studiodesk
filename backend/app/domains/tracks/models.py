from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class Track(TimestampedBase):
    __tablename__ = "tracks"

    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    volume: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    pan: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_solo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_phase_inverted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#ff8a1f", nullable=False)

    song: Mapped["Song"] = relationship(back_populates="tracks")  # noqa: F821
