from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

MARKER_TYPES = {
    "intro",
    "verse",
    "prechorus",
    "chorus",
    "bridge",
    "solo",
    "outro",
    "ending",
    "loop",
    "cue",
    "click",
}


class SongMarkerCreate(BaseModel):
    song_id: int
    label: str = Field(min_length=1, max_length=100)
    marker_type: str = Field(default="cue", pattern="^(" + "|".join(sorted(MARKER_TYPES)) + ")$")
    color: str = Field(default="#ff8a1f", max_length=20)
    position_seconds: float = Field(ge=0)
    end_time_seconds: float | None = Field(default=None, ge=0)
    loop_end_seconds: float | None = Field(default=None, ge=0)
    order_index: int = 0


class SongMarkerUpdate(SongMarkerCreate):
    pass


class SongMarkerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    song_id: int
    label: str
    marker_type: str
    color: str
    position_seconds: float
    end_time_seconds: float | None
    loop_end_seconds: float | None
    order_index: int
    created_at: datetime
    updated_at: datetime


class SectionSequenceItemCreate(BaseModel):
    song_id: int
    marker_id: int
    order_index: int | None = None


class SectionSequenceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    song_id: int
    marker_id: int
    order_index: int
    created_at: datetime
    updated_at: datetime


class SequenceReorder(BaseModel):
    item_ids: list[int]
