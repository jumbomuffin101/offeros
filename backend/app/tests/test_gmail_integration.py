import base64
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.core.tokens import TokenCipher
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.base import ApplicationStatus, Base
from app.models.gmail import GmailApplicationSuggestion, GmailConnection, GmailMessageReference
from app.models.user import User
from app.schemas.gmail import GmailSuggestionAcceptRequest
from app.services.gmail import (
    GMAIL_READONLY_SCOPE,
    MAX_EXCERPT,
    GmailService,
    match_application,
    parse_gmail_message,
    recruiting_filter,
)
from app.services.account import AccountService


class FakeGmailProvider:
    def __init__(self, messages: list[dict[str, object]] | None = None) -> None:
        self.messages = {str(message["id"]): message for message in messages or []}
        self.revoked = False
        self.fail_revoke = False
        self.queries: list[str] = []

    def exchange_code(self, code: str, verifier: str) -> dict[str, object]:
        assert code and verifier
        return {"access_token": "access-token", "refresh_token": "refresh-token", "scope": GMAIL_READONLY_SCOPE}

    def refresh_access_token(self, refresh_token: str) -> dict[str, object]:
        assert refresh_token == "refresh-token"
        return {"access_token": "access-token"}

    def profile(self, access_token: str) -> dict[str, object]:
        assert access_token == "access-token"
        return {"emailAddress": "candidate@example.com", "historyId": "200"}

    def list_messages(self, access_token: str, query: str, page_token: str | None) -> dict[str, object]:
        self.queries.append(query)
        ids = list(self.messages)
        midpoint = max(1, len(ids) // 2)
        selected = ids[:midpoint] if page_token is None else ids[midpoint:]
        return {
            "messages": [{"id": value} for value in selected],
            "nextPageToken": "page-2" if page_token is None and len(ids) > midpoint else None,
        }

    def history(self, access_token: str, history_id: str, page_token: str | None) -> dict[str, object]:
        return {"history": [], "historyId": "201"}

    def message(self, access_token: str, message_id: str) -> dict[str, object]:
        return self.messages[message_id]

    def revoke(self, refresh_token: str) -> None:
        if self.fail_revoke:
            raise RuntimeError("provider unavailable")
        self.revoked = True


@pytest.fixture
def gmail_settings() -> Settings:
    return Settings(
        app_env="test",
        auth_required=False,
        gmail_integration_enabled=True,
        google_oauth_client_id="client",
        google_oauth_client_secret="secret",
        google_oauth_redirect_uri="http://testserver/api/v1/integrations/gmail/callback",
        gmail_token_encryption_key=Fernet.generate_key().decode(),
        gmail_initial_sync_days=90,
        gmail_max_messages_per_sync=25,
    )


@pytest.fixture
def db() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def add_user(db: Session, suffix: str) -> User:
    user = User(clerk_user_id=f"gmail-{suffix}", email=f"{suffix}@example.com", name=suffix)
    db.add(user)
    db.commit()
    return user


def gmail_message(
    message_id: str,
    subject: str,
    body: str,
    *,
    sender: str = "Recruiter <recruiting@greenhouse.io>",
    mime_type: str = "text/plain",
) -> dict[str, object]:
    encoded = base64.urlsafe_b64encode(body.encode()).decode().rstrip("=")
    return {
        "id": message_id,
        "threadId": f"thread-{message_id}",
        "historyId": "150",
        "internalDate": str(int(datetime.now(UTC).timestamp() * 1000)),
        "snippet": body[:100],
        "payload": {
            "mimeType": mime_type,
            "headers": [
                {"name": "From", "value": sender},
                {"name": "Subject", "value": subject},
                {"name": "Date", "value": "Mon, 27 Jul 2026 12:00:00 +0000"},
            ],
            "body": {"data": encoded},
        },
    }


def connected_service(
    db: Session,
    settings: Settings,
    provider: FakeGmailProvider,
    user: User,
) -> GmailService:
    service = GmailService(db, settings, provider)
    state = parse_qs(urlparse(service.connect_url(user.id)).query)["state"][0]
    service.callback(state, "authorization-code")
    return service


def test_token_cipher_encrypts_and_wrong_key_fails() -> None:
    key = Fernet.generate_key().decode()
    cipher = TokenCipher(key, "Gmail")
    ciphertext = cipher.encrypt("refresh-token")
    assert ciphertext != "refresh-token"
    assert cipher.decrypt(ciphertext) == "refresh-token"
    with pytest.raises(AppError):
        TokenCipher(Fernet.generate_key().decode(), "Gmail").decrypt(ciphertext)


def test_oauth_url_is_read_only_pkce_and_callback_is_single_use(
    db: Session,
    gmail_settings: Settings,
) -> None:
    user = add_user(db, "oauth")
    service = GmailService(db, gmail_settings, FakeGmailProvider())
    url = service.connect_url(user.id)
    query = parse_qs(urlparse(url).query)
    assert GMAIL_READONLY_SCOPE in query["scope"][0]
    assert "gmail.modify" not in query["scope"][0]
    assert query["code_challenge_method"] == ["S256"]
    state = query["state"][0]
    connection = service.callback(state, "code")
    assert connection.encrypted_refresh_token != "refresh-token"
    assert connection.status == "connected"
    with pytest.raises(AppError, match="expired or is invalid"):
        service.callback(state, "code")
    assert "encrypted_refresh_token" not in service.status(user.id).model_dump()


def test_oauth_denial_and_missing_refresh_token_are_safe(
    db: Session,
    gmail_settings: Settings,
) -> None:
    denied_user = add_user(db, "denied")
    denied = GmailService(db, gmail_settings, FakeGmailProvider())
    denied_state = parse_qs(urlparse(denied.connect_url(denied_user.id)).query)["state"][0]
    with pytest.raises(AppError, match="not granted"):
        denied.callback(denied_state, None, "access_denied")

    class MissingRefreshProvider(FakeGmailProvider):
        def exchange_code(self, code: str, verifier: str) -> dict[str, object]:
            return {"access_token": "access-token", "scope": GMAIL_READONLY_SCOPE}

    missing_user = add_user(db, "missing-refresh")
    missing = GmailService(db, gmail_settings, MissingRefreshProvider())
    missing_state = parse_qs(urlparse(missing.connect_url(missing_user.id)).query)["state"][0]
    with pytest.raises(AppError, match="offline Gmail access"):
        missing.callback(missing_state, "code")


def test_mime_parser_handles_nested_html_ignores_attachment_and_caps_excerpt() -> None:
    html_body = "<h1>Interview</h1><p>Please schedule a technical interview.</p>"
    encoded = base64.urlsafe_b64encode(html_body.encode()).decode().rstrip("=")
    message = gmail_message("nested", "Interview invitation", "")
    message["payload"] = {
        "mimeType": "multipart/mixed",
        "headers": message["payload"]["headers"],
        "parts": [
            {
                "mimeType": "multipart/alternative",
                "parts": [{"mimeType": "text/html", "body": {"data": encoded}}],
            },
            {
                "mimeType": "application/pdf",
                "filename": "resume.pdf",
                "body": {"data": base64.urlsafe_b64encode(b"private attachment").decode()},
            },
        ],
    }
    parsed = parse_gmail_message(message)
    assert "technical interview" in parsed["excerpt"]
    assert "private attachment" not in parsed["excerpt"]
    long_parsed = parse_gmail_message(gmail_message("long", "Offer", "x" * (MAX_EXCERPT + 500)))
    assert len(long_parsed["excerpt"]) == MAX_EXCERPT


def test_filter_and_matching_are_deterministic(db: Session) -> None:
    user = add_user(db, "matching")
    app = Application(user_id=user.id, company="Acme", role="Software Engineer")
    db.add(app)
    db.commit()
    message = parse_gmail_message(gmail_message("match", "Acme technical interview", "Next steps for Software Engineer"))
    decision, reasons = recruiting_filter(message, [app])
    matched, confidence, match_reasons = match_application(message, [app])
    assert decision == "likely_recruiting"
    assert reasons
    assert matched and matched.id == app.id
    assert confidence >= 0.55 and match_reasons
    unrelated = parse_gmail_message(gmail_message("other", "Your receipt", "Thanks for shopping", sender="store@example.com"))
    assert recruiting_filter(unrelated, [app])[0] == "unlikely_recruiting"


def test_initial_sync_is_bounded_paginated_deduplicated_and_creates_suggestion(
    db: Session,
    gmail_settings: Settings,
) -> None:
    user = add_user(db, "sync")
    app = Application(user_id=user.id, company="Acme", role="Software Engineer")
    db.add(app)
    db.commit()
    provider = FakeGmailProvider([
        gmail_message("one", "Acme technical interview", "Schedule your technical interview in 2 days."),
        gmail_message("two", "Shopping receipt", "Thanks for shopping.", sender="store@example.com"),
    ])
    service = connected_service(db, gmail_settings, provider, user)
    result = service.sync(user.id)
    assert result.messages_scanned == 2
    assert result.candidates_found == 1
    assert result.suggestions_created == 1
    assert "newer_than:90d" in provider.queries[0]
    second = service.sync(user.id)
    assert second.suggestions_created == 0
    assert db.scalar(select(func.count(GmailApplicationSuggestion.id))) == 1


def test_ai_runs_only_after_deterministic_candidate_filter(
    db: Session,
    gmail_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class CaptureAI:
        provider = "capture"
        model = "capture-model"

        def __init__(self) -> None:
            self.calls = 0

        def chat(self, messages: list[dict[str, str]]) -> str:
            self.calls += 1
            assert "untrusted data" in messages[0]["content"]
            return (
                '{"is_recruiting_email":true,"email_type":"interview_invitation",'
                '"matched_application_id":null,"match_confidence":0.8,'
                '"company_name":"Acme","role_title":"Software Engineer",'
                '"recruiter_name":"Recruiter","event_at":null,"deadline_at":null,'
                '"suggested_status":"interview","reason_summary":"Interview language",'
                '"evidence":["Subject references interview"]}'
            )

    ai = CaptureAI()
    monkeypatch.setattr("app.services.gmail.copilot_provider_from_settings", lambda settings: ai)
    settings = gmail_settings.model_copy(update={"ai_provider": "openrouter", "openrouter_api_key": "test-key"})
    user = add_user(db, "selective-ai")
    db.add(Application(user_id=user.id, company="Acme", role="Software Engineer"))
    db.commit()
    provider = FakeGmailProvider([
        gmail_message("candidate", "Acme interview invitation", "Schedule your technical interview."),
        gmail_message("unrelated", "Weekly newsletter", "Recipes and weekend events.", sender="news@example.com"),
    ])
    connected_service(db, settings, provider, user).sync(user.id)
    assert ai.calls == 1


def test_accept_is_user_scoped_idempotent_and_status_requires_confirmation(
    db: Session,
    gmail_settings: Settings,
) -> None:
    owner = add_user(db, "owner")
    other = add_user(db, "other")
    application = Application(user_id=owner.id, company="Acme", role="Software Engineer", status=ApplicationStatus.APPLIED)
    db.add(application)
    db.commit()
    provider = FakeGmailProvider([gmail_message("accept", "Acme coding assessment", "Complete your assessment within 3 days.")])
    service = connected_service(db, gmail_settings, provider, owner)
    service.sync(owner.id)
    suggestion = db.scalar(select(GmailApplicationSuggestion))
    assert suggestion is not None
    with pytest.raises(NotFoundError):
        service.accept(
            other.id,
            suggestion.id,
            GmailSuggestionAcceptRequest(
                application_id=application.id,
                event_type="oa_received",
                event_at=datetime.now(UTC),
            ),
        )
    accepted = service.accept(
        owner.id,
        suggestion.id,
        GmailSuggestionAcceptRequest(
            application_id=application.id,
            event_type="oa_received",
            event_at=datetime.now(UTC),
            proposed_status=ApplicationStatus.OA,
            apply_status=False,
        ),
    )
    assert accepted.status == "accepted"
    assert db.get(Application, application.id).status == ApplicationStatus.APPLIED
    service.accept(
        owner.id,
        suggestion.id,
        GmailSuggestionAcceptRequest(
            application_id=application.id,
            event_type="oa_received",
            event_at=datetime.now(UTC),
        ),
    )
    assert db.scalar(select(func.count(ApplicationEvent.id))) == 1


def test_disconnect_revocation_failure_still_clears_token_and_delete_preserves_event(
    db: Session,
    gmail_settings: Settings,
) -> None:
    user = add_user(db, "disconnect")
    application = Application(user_id=user.id, company="Acme", role="Software Engineer")
    db.add(application)
    db.commit()
    provider = FakeGmailProvider([gmail_message("disconnect", "Acme offer", "Congratulations, this is your offer.")])
    service = connected_service(db, gmail_settings, provider, user)
    service.sync(user.id)
    suggestion = db.scalar(select(GmailApplicationSuggestion))
    exported = AccountService(db).export(user)
    serialized = str(exported)
    assert "refresh-token" not in serialized
    assert "encrypted_refresh_token" not in serialized
    assert "Congratulations, this is your offer." not in serialized
    service.accept(
        user.id,
        suggestion.id,
        GmailSuggestionAcceptRequest(
            application_id=application.id,
            event_type="offer_received",
            event_at=datetime.now(UTC) + timedelta(days=1),
        ),
    )
    provider.fail_revoke = True
    service.disconnect(user.id, True)
    connection = db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
    assert connection.status == "disconnected"
    assert connection.encrypted_refresh_token == ""
    assert db.scalar(select(func.count(ApplicationEvent.id))) == 1
    message = db.scalar(select(GmailMessageReference))
    assert message.normalized_body_excerpt is None
    assert message.sender_email == ""


def test_account_deletion_removes_all_gmail_records(
    db: Session,
    gmail_settings: Settings,
) -> None:
    user = add_user(db, "delete-account")
    db.add(Application(user_id=user.id, company="Acme", role="Software Engineer"))
    db.commit()
    provider = FakeGmailProvider([gmail_message("delete-account", "Acme interview", "Schedule your interview.")])
    connected_service(db, gmail_settings, provider, user).sync(user.id)
    AccountService(db).delete(user.id)
    assert db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id)) is None
    assert db.scalar(select(GmailMessageReference).where(GmailMessageReference.user_id == user.id)) is None
    assert db.scalar(select(GmailApplicationSuggestion).where(GmailApplicationSuggestion.user_id == user.id)) is None
