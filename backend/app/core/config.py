from functools import lru_cache
import json
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["local", "test", "staging", "production"] = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://offeros:offeros@localhost:5432/offeros"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    trusted_hosts: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "testserver"]
    )
    clerk_issuer: str | None = None
    clerk_jwks_url: str | None = None
    clerk_audience: str | None = None
    auth_required: bool = False
    ai_provider: str = "disabled"
    openrouter_api_key: str | None = None
    ai_model: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    ai_mock_enabled: bool = False
    ai_timeout_seconds: int = 240
    ai_connect_timeout_seconds: int = 15
    ai_max_tokens: int = 1800
    ai_limit_resume_analyses: int = 10
    ai_limit_application_analyses: int = 20
    ai_limit_prep_plans: int = 10
    ai_limit_mock_interviews: int = 5
    ai_limit_mock_interview_turns: int = 50
    ai_limit_copilot_messages: int = 50
    ai_limit_default: int = 20
    sentry_dsn: str | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_calendar_redirect_uri: str | None = None
    token_encryption_key: str | None = None
    frontend_app_url: str = "http://localhost:3000"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("["):
            return json.loads(raw)
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.app_env != "production":
            return self
        missing: list[str] = []
        if "localhost" in self.database_url or "offeros:offeros@" in self.database_url:
            missing.append("DATABASE_URL")
        if not self.auth_required:
            missing.append("AUTH_REQUIRED=true")
        for name, value in (
            ("CLERK_ISSUER", self.clerk_issuer),
            ("CLERK_JWKS_URL", self.clerk_jwks_url),
            ("CLERK_AUDIENCE", self.clerk_audience),
        ):
            if not value:
                missing.append(name)
        if not self.cors_origins or any("localhost" in origin for origin in self.cors_origins):
            missing.append("CORS_ORIGINS")
        if (
            not self.trusted_hosts
            or "*" in self.trusted_hosts
            or any(host in {"localhost", "127.0.0.1", "testserver"} for host in self.trusted_hosts)
        ):
            missing.append("TRUSTED_HOSTS")
        if "localhost" in self.frontend_app_url:
            missing.append("FRONTEND_APP_URL")
        if self.ai_provider == "openrouter" and not self.openrouter_api_key:
            missing.append("OPENROUTER_API_KEY")
        google_values = (
            self.google_client_id,
            self.google_client_secret,
            self.google_calendar_redirect_uri,
            self.token_encryption_key,
        )
        if any(google_values) and not all(google_values):
            missing.append("complete Google Calendar OAuth configuration")
        if missing:
            raise ValueError(
                "Production configuration is incomplete: " + ", ".join(sorted(set(missing)))
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
