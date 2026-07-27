import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.observability import _scrub_sentry_event


def test_production_configuration_rejects_local_defaults() -> None:
    with pytest.raises(ValidationError) as raised:
        Settings(app_env="production")
    message = str(raised.value)
    assert "DATABASE_URL" in message
    assert "AUTH_REQUIRED=true" in message
    assert "TRUSTED_HOSTS" in message


def test_production_configuration_accepts_required_values_without_sentry() -> None:
    settings = Settings(
        app_env="production",
        database_url="postgresql+psycopg://user:password@db.example.com/offeros",
        auth_required=True,
        clerk_issuer="https://clerk.example.com",
        clerk_jwks_url="https://clerk.example.com/.well-known/jwks.json",
        clerk_audience="offeros-api",
        cors_origins=["https://app.example.com"],
        trusted_hosts=["api.example.com"],
        frontend_app_url="https://app.example.com",
    )
    assert settings.sentry_dsn is None


def test_sentry_scrubbing_removes_sensitive_nested_values() -> None:
    event = {
        "request": {
            "headers": {
                "Authorization": "Bearer private",
                "Cookie": "session=private",
            },
            "data": {"resume_text": "private resume"},
        },
        "extra": {
            "resume_text": "private resume",
            "job_description": "private job",
            "mock_interview_answer": "private answer",
            "openrouter_api_key": "private key",
            "safe_count": 2,
        },
        "breadcrumbs": [{"data": {"prompt": "private prompt", "status": 500}}],
    }
    scrubbed = _scrub_sentry_event(event, {})
    serialized = str(scrubbed)
    assert "private" not in serialized
    assert scrubbed["extra"]["safe_count"] == 2
    assert scrubbed["breadcrumbs"][0]["data"]["status"] == 500


def test_sentry_scrubbing_removes_gmail_content_and_identity() -> None:
    event = {
        "extra": {
            "gmail_address": "candidate@example.com",
            "sender_email": "recruiter@example.com",
            "normalized_body_excerpt": "private recruiting message",
            "oauth_state": "state-secret",
            "safe_count": 3,
        }
    }
    scrubbed = _scrub_sentry_event(event, {})
    assert scrubbed["extra"]["gmail_address"] == "[Filtered]"
    assert scrubbed["extra"]["sender_email"] == "[Filtered]"
    assert scrubbed["extra"]["normalized_body_excerpt"] == "[Filtered]"
    assert scrubbed["extra"]["oauth_state"] == "[Filtered]"
    assert scrubbed["extra"]["safe_count"] == 3
