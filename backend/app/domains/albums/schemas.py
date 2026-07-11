from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AlbumCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    artist: str = Field(min_length=1, max_length=255)
    cover_image_path: str | None = None


class AlbumUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    artist: str = Field(min_length=1, max_length=255)
    cover_image_path: str | None = None


class AlbumRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist: str
    cover_image_path: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime
