from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class SongMarker(TimestampedBase):
    __tablename__ = "song_markers"

    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    marker_type: Mapped[str] = mapped_column(String(20), nullable=False, default="cue")
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#ff8a1f")
    position_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    loop_end_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    song: Mapped["Song"] = relationship()  # noqa: F821
