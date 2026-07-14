from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_state_token, decode_token
from app.db.session import get_db
from app.domains.users.models import User
from app.domains.youtube.schemas import YouTubeAuthUrl, YouTubeStatus, YouTubeVideoList
from app.domains.youtube.service import (
    build_auth_url,
    delete_credential,
    exchange_code_for_tokens,
    fetch_google_email,
    get_credential,
    get_valid_access_token,
    list_my_videos,
    upsert_credential,
)

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/oauth/start", response_model=YouTubeAuthUrl)
def oauth_start(current_user: Annotated[User, Depends(get_current_user)]):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Integración de YouTube no configurada"
        )
    state = create_state_token(str(current_user.id))
    return YouTubeAuthUrl(url=build_auth_url(state))


@router.get("/oauth/callback")
async def oauth_callback(
    db: Annotated[Session, Depends(get_db)],
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
):
    if error or not code or not state:
        return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard/youtube-import?error=1")

    payload = decode_token(state)
    if payload is None or payload.get("type") != "state":
        return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard/youtube-import?error=1")

    try:
        user_id = int(payload["sub"])
        token_data = await exchange_code_for_tokens(code)
        google_email = await fetch_google_email(token_data["access_token"])
        upsert_credential(db, user_id, google_email, token_data)
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard/youtube-import?error=1")

    return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard/youtube-import?connected=1")


@router.get("/status", response_model=YouTubeStatus)
def youtube_status(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    credential = get_credential(db, current_user.id)
    if credential is None:
        return YouTubeStatus(connected=False)
    return YouTubeStatus(connected=True, google_email=credential.google_email)


@router.get("/my-videos", response_model=YouTubeVideoList)
async def my_videos(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page_token: str | None = Query(default=None),
):
    credential = get_credential(db, current_user.id)
    if credential is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cuenta de YouTube no conectada")
    try:
        access_token = await get_valid_access_token(db, credential)
        result = await list_my_videos(access_token, page_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo consultar YouTube"
        ) from exc
    return YouTubeVideoList(videos=result["videos"], next_page_token=result["next_page_token"])


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    credential = get_credential(db, current_user.id)
    if credential is not None:
        delete_credential(db, credential)
