from pydantic import BaseModel


class YouTubeAuthUrl(BaseModel):
    url: str


class YouTubeStatus(BaseModel):
    connected: bool
    google_email: str | None = None


class YouTubeVideo(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str
    published_at: str


class YouTubeVideoList(BaseModel):
    videos: list[YouTubeVideo]
    next_page_token: str | None = None
