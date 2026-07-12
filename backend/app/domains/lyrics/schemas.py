from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LyricLineCreate(BaseModel):
    song_id: int
    order_index: int = 0
    time_seconds: float = Field(ge=0)
    text: str = Field(min_length=1, max_length=500)
    chord: str | None = Field(default=None, max_length=20)


class LyricLineUpdate(LyricLineCreate):
    pass


class LyricLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    song_id: int
    order_index: int
    time_seconds: float
    text: str
    chord: str | None
    created_at: datetime
    updated_at: datetime
