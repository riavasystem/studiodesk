from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class PlaylistUpdate(PlaylistCreate):
    pass


class PlaylistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: int
    created_at: datetime
    updated_at: datetime


class PlaylistSongCreate(BaseModel):
    song_id: int
    order_index: int = 0


class PlaylistSongRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    playlist_id: int
    song_id: int
    order_index: int
    created_at: datetime
    updated_at: datetime
