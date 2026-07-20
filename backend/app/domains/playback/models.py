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
    end_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    loop_end_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    song: Mapped["Song"] = relationship()  # noqa: F821


class SectionSequenceItem(TimestampedBase):
    """One slot in a song's editable playback sequence. References an existing
    SongMarker (section) without ever touching the underlying audio — the same
    marker can appear in multiple slots (repeats) at any position."""

    __tablename__ = "section_sequence_items"

    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    marker_id: Mapped[int] = mapped_column(
        ForeignKey("song_markers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    song: Mapped["Song"] = relationship()  # noqa: F821
    marker: Mapped["SongMarker"] = relationship()
