from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.lyrics.models import LyricLine
from app.domains.lyrics.schemas import LyricLineCreate, LyricLineUpdate


def get_line(db: Session, line_id: int) -> LyricLine | None:
    return db.get(LyricLine, line_id)


def list_lines_by_song(db: Session, song_id: int) -> list[LyricLine]:
    return list(
        db.scalars(select(LyricLine).where(LyricLine.song_id == song_id).order_by(LyricLine.time_seconds))
    )


def create_line(db: Session, line_in: LyricLineCreate) -> LyricLine:
    line = LyricLine(**line_in.model_dump())
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


def update_line(db: Session, line: LyricLine, line_in: LyricLineUpdate) -> LyricLine:
    for field, value in line_in.model_dump().items():
        setattr(line, field, value)
    db.commit()
    db.refresh(line)
    return line


def delete_line(db: Session, line: LyricLine) -> None:
    db.delete(line)
    db.commit()
