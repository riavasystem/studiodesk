from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Salem Studio API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+psycopg://user:password@localhost:5432/salem_studio"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    STORAGE_PATH: str = "/data/salem-studio/storage"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    FRONTEND_URL: str = "http://localhost:3000"

    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
