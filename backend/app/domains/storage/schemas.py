from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AudioFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    storage_path: str
    mime_type: str
    size_bytes: int
    uploaded_by_id: int
    created_at: datetime
    updated_at: datetime
