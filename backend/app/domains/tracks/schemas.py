from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TrackCreate(BaseModel):
    song_id: int
    name: str = Field(min_length=1, max_length=100)
    file_path: str = Field(min_length=1, max_length=500)
    order_index: int = 0
    volume: float = Field(default=1.0, ge=0.0, le=2.0)
    is_muted: bool = False
    is_solo: bool = False


class TrackUpdate(TrackCreate):
    pass


class TrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    song_id: int
    name: str
    file_path: str
    order_index: int
    volume: float
    is_muted: bool
    is_solo: bool
    created_at: datetime
    updated_at: datetime
