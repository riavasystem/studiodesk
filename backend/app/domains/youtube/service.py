from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domains.youtube.models import YouTubeCredential

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
SCOPE = "https://www.googleapis.com/auth/youtube.readonly"


def build_auth_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            },
        )
        response.raise_for_status()
        return response.json()


async def fetch_channel_title(access_token: str) -> str:
    """We only request the youtube.readonly scope (not userinfo.email), so we
    identify the connected account by its YouTube channel name instead."""
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={"part": "snippet", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        items = response.json().get("items", [])
        return items[0]["snippet"]["title"] if items else "tu canal"


def upsert_credential(db: Session, user_id: int, google_email: str, token_data: dict) -> YouTubeCredential:
    expires_at = datetime.now(UTC) + timedelta(seconds=token_data.get("expires_in", 3600))
    credential = db.query(YouTubeCredential).filter(YouTubeCredential.user_id == user_id).first()
    if credential is None:
        credential = YouTubeCredential(
            user_id=user_id,
            google_email=google_email,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            expires_at=expires_at,
        )
        db.add(credential)
    else:
        credential.google_email = google_email
        credential.access_token = token_data["access_token"]
        if token_data.get("refresh_token"):
            credential.refresh_token = token_data["refresh_token"]
        credential.expires_at = expires_at
    db.commit()
    db.refresh(credential)
    return credential


def get_credential(db: Session, user_id: int) -> YouTubeCredential | None:
    return db.query(YouTubeCredential).filter(YouTubeCredential.user_id == user_id).first()


async def get_valid_access_token(db: Session, credential: YouTubeCredential) -> str:
    if credential.expires_at > datetime.now(UTC) + timedelta(seconds=60):
        return credential.access_token

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "refresh_token": credential.refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        token_data = response.json()

    credential.access_token = token_data["access_token"]
    credential.expires_at = datetime.now(UTC) + timedelta(seconds=token_data.get("expires_in", 3600))
    db.commit()
    db.refresh(credential)
    return credential.access_token


async def list_my_videos(access_token: str, page_token: str | None = None) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=15) as client:
        channels_response = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={"part": "contentDetails", "mine": "true"},
            headers=headers,
        )
        channels_response.raise_for_status()
        channels_data = channels_response.json()
        items = channels_data.get("items", [])
        if not items:
            return {"videos": [], "next_page_token": None}

        uploads_playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

        playlist_params = {
            "part": "snippet",
            "playlistId": uploads_playlist_id,
            "maxResults": 24,
        }
        if page_token:
            playlist_params["pageToken"] = page_token

        playlist_response = await client.get(
            f"{YOUTUBE_API_BASE}/playlistItems", params=playlist_params, headers=headers
        )
        playlist_response.raise_for_status()
        playlist_data = playlist_response.json()

    videos = [
        {
            "video_id": item["snippet"]["resourceId"]["videoId"],
            "title": item["snippet"]["title"],
            "thumbnail_url": (
                item["snippet"].get("thumbnails", {}).get("medium", {}).get("url")
                or item["snippet"].get("thumbnails", {}).get("default", {}).get("url", "")
            ),
            "published_at": item["snippet"].get("publishedAt", ""),
        }
        for item in playlist_data.get("items", [])
    ]
    return {"videos": videos, "next_page_token": playlist_data.get("nextPageToken")}


def delete_credential(db: Session, credential: YouTubeCredential) -> None:
    db.delete(credential)
    db.commit()
