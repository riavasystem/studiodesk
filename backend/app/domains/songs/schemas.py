from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SongCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    artist: str = Field(min_length=1, max_length=255)
    bpm: int | None = None
    musical_key: str | None = Field(default=None, max_length=10)
    duration_seconds: float | None = None
    category_id: int | None = None
    album_id: int | None = None


class SongUpdate(SongCreate):
    pass


class SongRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist: str
    bpm: int | None
    musical_key: str | None
    duration_seconds: float | None
    category_id: int | None
    album_id: int | None
    owner_id: int
    created_at: datetime
    updated_at: datetime
