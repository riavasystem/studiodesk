from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.songs.service import get_song
from app.domains.stems.schemas import StemJobRead
from app.domains.stems.service import (
    ACCEPTED_EXTENSIONS,
    create_stem_job,
    get_stem_job,
    probe_duration_seconds,
    save_stem_upload,
)
from app.domains.users.models import User

router = APIRouter(prefix="/stems", tags=["stems"])


@router.post("/separate", response_model=StemJobRead, status_code=status.HTTP_202_ACCEPTED)
async def separate_stems(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    song_id: Annotated[int, Form()],
    file: UploadFile,
):
    song = get_song(db, song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canción no encontrada")
    if song.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta canción")

    filename = file.filename or "song"
    extension = Path(filename).suffix.lower()
    if extension not in ACCEPTED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Formato no soportado")

    source_path = await save_stem_upload(file, filename)
    try:
        duration = probe_duration_seconds(source_path)
    except ValueError as exc:
        source_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return create_stem_job(
        db, owner_id=current_user.id, song_id=song_id, original_filename=filename, source_path=source_path, duration=duration
    )


@router.get("/{job_id}", response_model=StemJobRead)
def read_stem_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = get_stem_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Separación no encontrada")
    if job.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta separación")
    return job
