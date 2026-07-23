import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Protocol
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.core.tokens import TokenCipher
from app.models.application import Application
from app.models.calendar import CalendarConnection
from app.models.application_event import ApplicationEvent
from app.schemas.calendar import CalendarStatusResponse


class CalendarProvider(Protocol):
    def exchange_code(self, code: str) -> dict[str, object]: ...
    def account_email(self, access_token: str) -> str: ...
    def create_event(self, access_token: str, event: ApplicationEvent, application: Application) -> str: ...
    def update_event(self, access_token: str, external_id: str, event: ApplicationEvent, application: Application) -> None: ...
    def refresh_access_token(self, refresh_token: str) -> dict[str, object]: ...


class GoogleCalendarProvider:
    def __init__(self, settings: Settings) -> None:
        if not settings.google_client_id or not settings.google_client_secret or not settings.google_calendar_redirect_uri:
            raise AppError("integration_not_configured", "Google Calendar is not configured.", 503)
        self.settings = settings

    def exchange_code(self, code: str) -> dict[str, object]:
        return self._token_request({"code": code, "grant_type": "authorization_code", "redirect_uri": self.settings.google_calendar_redirect_uri})

    def refresh_access_token(self, refresh_token: str) -> dict[str, object]:
        return self._token_request({"refresh_token": refresh_token, "grant_type": "refresh_token"})

    def account_email(self, access_token: str) -> str:
        response = httpx.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {access_token}"}, timeout=20)
        response.raise_for_status()
        return str(response.json().get("email") or "")

    def create_event(self, access_token: str, event: ApplicationEvent, application: Application) -> str:
        response = httpx.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", headers=self._headers(access_token), json=self._event_body(event, application), timeout=25)
        self._raise(response)
        return str(response.json()["id"])

    def update_event(self, access_token: str, external_id: str, event: ApplicationEvent, application: Application) -> None:
        response = httpx.put(f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{external_id}", headers=self._headers(access_token), json=self._event_body(event, application), timeout=25)
        self._raise(response)

    def _token_request(self, values: dict[str, str]) -> dict[str, object]:
        response = httpx.post("https://oauth2.googleapis.com/token", data={**values, "client_id": self.settings.google_client_id, "client_secret": self.settings.google_client_secret}, timeout=25)
        self._raise(response)
        return response.json()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    @staticmethod
    def _event_body(event: ApplicationEvent, application: Application) -> dict[str, object]:
        end = event.scheduled_at + timedelta(hours=1)
        description = "\n\n".join(filter(None, [event.description, f"{application.company} - {application.role}", application.job_url or ""]))
        return {"summary": event.title, "description": description, "start": {"dateTime": event.scheduled_at.isoformat()}, "end": {"dateTime": end.isoformat()}}

    @staticmethod
    def _raise(response: httpx.Response) -> None:
        if response.is_error:
            raise AppError("calendar_provider_error", "Google Calendar could not complete the request.", 502)


class CalendarService:
    def __init__(self, db: Session, settings: Settings, provider: CalendarProvider | None = None) -> None:
        self.db, self.settings = db, settings
        self.provider = provider

    def connect_url(self, user_id: UUID) -> str:
        self._provider()
        connection = self._connection(user_id) or CalendarConnection(user_id=user_id, provider="google")
        state = secrets.token_urlsafe(32)
        connection.oauth_state_hash = hashlib.sha256(state.encode()).hexdigest()
        connection.oauth_state_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        connection.connection_status = "pending"
        self.db.add(connection)
        self.db.commit()
        query = urlencode({"client_id": self.settings.google_client_id, "redirect_uri": self.settings.google_calendar_redirect_uri, "response_type": "code", "scope": "openid email https://www.googleapis.com/auth/calendar.events", "access_type": "offline", "prompt": "consent", "state": state})
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    def callback(self, state: str, code: str) -> None:
        state_hash = hashlib.sha256(state.encode()).hexdigest()
        connection = self.db.scalar(select(CalendarConnection).where(CalendarConnection.provider == "google", CalendarConnection.oauth_state_hash == state_hash))
        if connection is None or not connection.oauth_state_expires_at or _as_utc(connection.oauth_state_expires_at) < datetime.now(UTC):
            raise AppError("invalid_oauth_state", "The Google Calendar connection request expired or is invalid.", 400)
        provider = self._provider()
        cipher = self._cipher()
        tokens = provider.exchange_code(code)
        access_token = str(tokens.get("access_token") or "")
        if not access_token:
            raise AppError("calendar_provider_error", "Google did not return an access token.", 502)
        refresh_token = str(tokens.get("refresh_token") or "")
        connection.access_token_encrypted = cipher.encrypt(access_token)
        if refresh_token:
            connection.refresh_token_encrypted = cipher.encrypt(refresh_token)
        connection.token_expires_at = datetime.now(UTC) + timedelta(seconds=int(tokens.get("expires_in") or 3600))
        connection.provider_account_email = provider.account_email(access_token)
        connection.connection_status = "connected"
        connection.oauth_state_hash = None
        connection.oauth_state_expires_at = None
        self.db.commit()

    def status(self, user_id: UUID) -> CalendarStatusResponse:
        connection = self._connection(user_id)
        if connection is None or connection.connection_status != "connected":
            return CalendarStatusResponse()
        return CalendarStatusResponse(connected=True, provider_account_email=connection.provider_account_email or None, connection_status=connection.connection_status, token_expires_at=connection.token_expires_at)

    def disconnect(self, user_id: UUID) -> None:
        connection = self._connection(user_id)
        if connection:
            self.db.delete(connection)
            self.db.commit()

    def sync_event(self, user_id: UUID, event: ApplicationEvent, application: Application) -> ApplicationEvent:
        connection = self._connection(user_id)
        if connection is None or connection.connection_status != "connected":
            raise AppError("calendar_not_connected", "Connect Google Calendar in Settings first.", 409)
        token = self._access_token(connection)
        provider = self._provider()
        if event.external_calendar_event_id:
            provider.update_event(token, event.external_calendar_event_id, event, application)
        else:
            event.external_calendar_event_id = provider.create_event(token, event, application)
        self.db.commit()
        self.db.refresh(event)
        return event

    def _access_token(self, connection: CalendarConnection) -> str:
        provider = self._provider()
        cipher = self._cipher()
        if connection.token_expires_at and _as_utc(connection.token_expires_at) <= datetime.now(UTC) + timedelta(minutes=1):
            if not connection.refresh_token_encrypted:
                raise AppError("calendar_token_expired", "Reconnect Google Calendar to continue.", 401)
            tokens = provider.refresh_access_token(cipher.decrypt(connection.refresh_token_encrypted))
            token = str(tokens.get("access_token") or "")
            connection.access_token_encrypted = cipher.encrypt(token)
            connection.token_expires_at = datetime.now(UTC) + timedelta(seconds=int(tokens.get("expires_in") or 3600))
            self.db.commit()
            return token
        return cipher.decrypt(connection.access_token_encrypted)

    def _connection(self, user_id: UUID) -> CalendarConnection | None:
        return self.db.scalar(select(CalendarConnection).where(CalendarConnection.user_id == user_id, CalendarConnection.provider == "google"))

    def _provider(self) -> CalendarProvider:
        if self.provider is None:
            self.provider = GoogleCalendarProvider(self.settings)
        return self.provider

    def _cipher(self) -> TokenCipher:
        return TokenCipher(self.settings.token_encryption_key)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
