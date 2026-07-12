from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.lyrics.models import LyricLine
from app.domains.lyrics.schemas import LyricLineCreate, LyricLineRead, LyricLineUpdate
from app.domains.lyrics.service import create_line, delete_line, get_line, list_lines_by_song, update_line
from app.domains.songs.service import get_song
from app.domains.users.models import User

router = APIRouter(prefix="/lyrics", tags=["lyrics"])


def _ensure_song_owner_or_superuser(db: Session, song_id: int, user: User) -> None:
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    if song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta canción")


def _ensure_line_owner_or_superuser(line: LyricLine, user: User) -> None:
    if line.song.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta línea")


@router.get("", response_model=list[LyricLineRead])
def read_lines(
    song_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return list_lines_by_song(db, song_id)


@router.post("", response_model=LyricLineRead, status_code=status.HTTP_201_CREATED)
def create_line_endpoint(
    line_in: LyricLineCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_song_owner_or_superuser(db, line_in.song_id, current_user)
    return create_line(db, line_in)


@router.put("/{line_id}", response_model=LyricLineRead)
def update_line_endpoint(
    line_id: int,
    line_in: LyricLineUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    line = get_line(db, line_id)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Línea no encontrada")
    _ensure_line_owner_or_superuser(line, current_user)
    return update_line(db, line, line_in)


@router.delete("/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_line_endpoint(
    line_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    line = get_line(db, line_id)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Línea no encontrada")
    _ensure_line_owner_or_superuser(line, current_user)
    delete_line(db, line)
