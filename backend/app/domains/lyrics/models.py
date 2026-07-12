from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class LyricLine(TimestampedBase):
    __tablename__ = "lyric_lines"

    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    chord: Mapped[str | None] = mapped_column(String(20), nullable=True)

    song: Mapped["Song"] = relationship()  # noqa: F821
