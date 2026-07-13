from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    song_id: int | None
    status: str
    original_filename: str
    total_files: int
    processed_files: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime
