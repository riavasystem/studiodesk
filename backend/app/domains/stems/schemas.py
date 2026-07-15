from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StemJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    song_id: int
    status: str
    original_filename: str
    duration_seconds: float | None
    stems_created: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime
