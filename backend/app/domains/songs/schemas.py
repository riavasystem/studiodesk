from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SongCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    artist: str = Field(min_length=1, max_length=255)
    bpm: int | None = None
    musical_key: str | None = Field(default=None, max_length=10)
    time_signature: str = Field(default="4/4", max_length=10)
    duration_seconds: float | None = None
    language: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    tags: str | None = Field(default=None, max_length=500)
    song_date: date | None = None
    cover_image_url: str | None = Field(default=None, max_length=500)
    color: str = Field(default="#ff8a1f", max_length=20)
    is_favorite: bool = False
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
    time_signature: str
    duration_seconds: float | None
    language: str | None
    notes: str | None
    tags: str | None
    song_date: date | None
    cover_image_url: str | None
    color: str
    is_favorite: bool
    category_id: int | None
    album_id: int | None
    owner_id: int
    created_at: datetime
    updated_at: datetime
