from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.domains.imports.schemas import ImportJobRead
from app.domains.imports.service import create_song_and_job, get_import_job, process_zip_import, save_zip_upload
from app.domains.users.models import User

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/zip", response_model=ImportJobRead, status_code=status.HTTP_202_ACCEPTED)
async def import_zip(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    file: UploadFile,
):
    filename = file.filename or "import.zip"
    if Path(filename).suffix.lower() != ".zip":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El archivo debe ser un .zip")

    zip_path, _size = await save_zip_upload(file, filename)
    job = create_song_and_job(db, owner_id=current_user.id, artist=current_user.full_name, original_filename=filename, zip_path=zip_path)

    background_tasks.add_task(process_zip_import, job.id)
    return job


@router.get("/{job_id}", response_model=ImportJobRead)
def read_import_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = get_import_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Importación no encontrada")
    if job.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre esta importación")
    return job
