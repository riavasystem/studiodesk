from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_header_or_query
from app.db.session import get_db
from app.domains.storage.models import AudioFile
from app.domains.storage.schemas import AudioFileRead
from app.domains.storage.service import delete_audio_file, get_audio_file, save_audio_file
from app.domains.users.models import User

router = APIRouter(prefix="/storage", tags=["storage"])


def _ensure_owner_or_superuser(audio_file: AudioFile, user: User) -> None:
    if audio_file.uploaded_by_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este archivo")


@router.post("/upload", response_model=AudioFileRead, status_code=status.HTTP_201_CREATED)
async def upload_audio_file(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile,
):
    try:
        return await save_audio_file(db, file, uploaded_by_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{file_id}")
def download_audio_file(
    file_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user_header_or_query)],
):
    audio_file = get_audio_file(db, file_id)
    if audio_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    _ensure_owner_or_superuser(audio_file, current_user)
    return FileResponse(
        audio_file.storage_path,
        media_type=audio_file.mime_type,
        filename=audio_file.original_filename,
        # Content at a given file_id never changes once created, so the browser
        # can safely cache it across page loads/sessions without revalidating.
        headers={"Cache-Control": "private, max-age=604800, immutable"},
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audio_file_endpoint(
    file_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    audio_file = get_audio_file(db, file_id)
    if audio_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    _ensure_owner_or_superuser(audio_file, current_user)
    delete_audio_file(db, audio_file)
