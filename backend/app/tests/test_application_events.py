from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.base import Base
from app.models.user import User
from app.schemas.application_event import ApplicationEventCreate
from app.services.application_events import ApplicationEventService
from app.services.calendar import CalendarService


def create_application(client: TestClient, company: str = "Acme") -> dict[str, object]:
    return client.post("/api/v1/applications", json={"company": company, "role": "Software Engineer"}).json()["data"]


def event_payload(hours: int = 24, event_type: str = "technical_interview") -> dict[str, object]:
    return {"event_type": event_type, "title": "Technical interview", "description": "Meet the engineering team.", "scheduled_at": (datetime.now(UTC) + timedelta(hours=hours)).isoformat(), "status": "upcoming", "source": "manual"}


def test_application_event_crud_and_next_action(client: TestClient) -> None:
    application = create_application(client)
    created = client.post(f"/api/v1/applications/{application['id']}/events", json=event_payload())
    assert created.status_code == 201
    event = created.json()["data"]
    listed = client.get(f"/api/v1/applications/{application['id']}/events")
    assert listed.status_code == 200 and listed.json()["data"][0]["id"] == event["id"]
    refreshed_application = client.get(f"/api/v1/applications/{application['id']}").json()["data"]
    assert refreshed_application["next_action"] == "Technical interview"
    completed = client.patch(f"/api/v1/application-events/{event['id']}", json={"status": "completed"})
    assert completed.json()["data"]["completed_at"] is not None
    assert client.delete(f"/api/v1/application-events/{event['id']}").status_code == 204
    assert client.get(f"/api/v1/applications/{application['id']}/events").json()["data"] == []


def test_upcoming_order_focus_priority_and_empty_focus(client: TestClient) -> None:
    application = create_application(client)
    assert client.get("/api/v1/focus").json()["data"] is None
    client.post(f"/api/v1/applications/{application['id']}/events", json=event_payload(48, "technical_interview"))
    urgent = client.post(f"/api/v1/applications/{application['id']}/events", json=event_payload(12, "oa_deadline")).json()["data"]
    upcoming = client.get("/api/v1/dashboard/upcoming-events").json()["data"]
    assert upcoming[0]["id"] == urgent["id"]
    focus = client.get("/api/v1/focus").json()["data"]
    assert focus["type"] == "oa_deadline" and focus["priority"] == 90


def test_event_user_isolation() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with session_factory() as db:
            owner = User(id=uuid4(), clerk_user_id="events-owner", email="events-owner@example.com", name="Owner")
            other = User(id=uuid4(), clerk_user_id="events-other", email="events-other@example.com", name="Other")
            db.add_all([owner, other]); db.flush()
            application = Application(user_id=owner.id, company="Acme", role="SWE")
            db.add(application); db.commit()
            event = ApplicationEventService(db).create(owner.id, application.id, ApplicationEventCreate.model_validate(event_payload()))
            with pytest.raises(NotFoundError):
                ApplicationEventService(db).get(other.id, event.id)
    finally:
        Base.metadata.drop_all(engine); engine.dispose()


class MockGoogleProvider:
    def exchange_code(self, code: str) -> dict[str, object]: return {"access_token": "access", "refresh_token": "refresh", "expires_in": 3600}
    def account_email(self, access_token: str) -> str: return "user@example.com"
    def create_event(self, access_token: str, event: ApplicationEvent, application: Application) -> str: return "google-event-1"
    def update_event(self, access_token: str, external_id: str, event: ApplicationEvent, application: Application) -> None: return None
    def refresh_access_token(self, refresh_token: str) -> dict[str, object]: return {"access_token": "refreshed", "expires_in": 3600}


def test_google_oauth_state_calendar_creation_and_disconnect_preserves_event() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    settings = Settings(app_env="test", database_url="sqlite+pysqlite:///:memory:", google_client_id="client", google_client_secret="secret", google_calendar_redirect_uri="http://test/callback", token_encryption_key=Fernet.generate_key().decode())
    try:
        with session_factory() as db:
            user = User(id=uuid4(), clerk_user_id="calendar-user", email="calendar@example.com", name="Calendar User")
            db.add(user); db.flush()
            application = Application(user_id=user.id, company="Acme", role="SWE")
            db.add(application); db.commit()
            event = ApplicationEventService(db).create(user.id, application.id, ApplicationEventCreate.model_validate(event_payload()))
            service = CalendarService(db, settings, MockGoogleProvider())
            with pytest.raises(AppError): service.callback("invalid-state-value-that-is-long", "code")
            state = parse_qs(urlparse(service.connect_url(user.id)).query)["state"][0]
            service.callback(state, "code")
            synced = service.sync_event(user.id, event, application)
            assert synced.external_calendar_event_id == "google-event-1"
            service.disconnect(user.id)
            assert db.scalar(select(ApplicationEvent).where(ApplicationEvent.id == event.id)) is not None
    finally:
        Base.metadata.drop_all(engine); engine.dispose()
