from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["local", "test", "staging", "production"] = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://offeros:offeros@localhost:5432/offeros"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    clerk_issuer: str | None = None
    clerk_jwks_url: str | None = None
    clerk_audience: str | None = None
    auth_required: bool = False
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
