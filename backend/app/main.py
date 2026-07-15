from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.domains.albums.router import router as albums_router
from app.domains.auth.router import router as auth_router
from app.domains.categories.router import router as categories_router
from app.domains.imports.router import router as imports_router
from app.domains.lyrics.router import router as lyrics_router
from app.domains.playback.router import router as playback_router
from app.domains.playlists.router import router as playlists_router
from app.domains.songs.router import router as songs_router
from app.domains.stems.router import router as stems_router
from app.domains.storage.router import router as storage_router
from app.domains.tracks.router import router as tracks_router
from app.domains.users.router import router as users_router
from app.domains.youtube.router import router as youtube_router

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

routers = (
    auth_router,
    users_router,
    songs_router,
    tracks_router,
    playlists_router,
    albums_router,
    categories_router,
    storage_router,
    playback_router,
    lyrics_router,
    imports_router,
    youtube_router,
    stems_router,
)

for domain_router in routers:
    app.include_router(domain_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
