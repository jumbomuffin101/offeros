from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.schemas.application_event import (
    ApplicationEventCreate,
    ApplicationEventResponse,
    ApplicationEventUpdate,
    UpcomingEventResponse,
)
from app.schemas.common import persistence_values
from app.services.validation import reject_null_fields


class ApplicationEventService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, user_id: UUID, application_id: UUID) -> list[ApplicationEvent]:
        self._application(user_id, application_id)
        return list(self.db.scalars(select(ApplicationEvent).where(ApplicationEvent.user_id == user_id, ApplicationEvent.application_id == application_id, ApplicationEvent.deleted_at.is_(None)).order_by(ApplicationEvent.scheduled_at)))

    def create(self, user_id: UUID, application_id: UUID, payload: ApplicationEventCreate) -> ApplicationEvent:
        self._application(user_id, application_id)
        values = persistence_values(payload)
        if values.get("status") == "completed":
            values["completed_at"] = datetime.now(UTC)
        event = ApplicationEvent(user_id=user_id, application_id=application_id, **values)
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def update(self, user_id: UUID, event_id: UUID, payload: ApplicationEventUpdate) -> ApplicationEvent:
        event = self.get(user_id, event_id)
        values = persistence_values(payload, exclude_unset=True)
        reject_null_fields(values, {"event_type", "title", "description", "scheduled_at", "status"})
        for field, value in values.items():
            setattr(event, field, value)
        if payload.status == "completed" and event.completed_at is None:
            event.completed_at = datetime.now(UTC)
        elif payload.status in {"upcoming", "canceled"}:
            event.completed_at = None
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete(self, user_id: UUID, event_id: UUID) -> None:
        event = self.get(user_id, event_id)
        event.deleted_at = datetime.now(UTC)
        self.db.commit()

    def get(self, user_id: UUID, event_id: UUID) -> ApplicationEvent:
        event = self.db.scalar(select(ApplicationEvent).where(ApplicationEvent.id == event_id, ApplicationEvent.user_id == user_id, ApplicationEvent.deleted_at.is_(None)))
        if event is None:
            raise NotFoundError("Application event")
        return event

    def upcoming(self, user_id: UUID, days: int = 14) -> list[UpcomingEventResponse]:
        now = datetime.now(UTC)
        rows = self.db.execute(select(ApplicationEvent, Application).join(Application, Application.id == ApplicationEvent.application_id).where(ApplicationEvent.user_id == user_id, ApplicationEvent.deleted_at.is_(None), ApplicationEvent.status == "upcoming", ApplicationEvent.scheduled_at >= now - timedelta(days=30), ApplicationEvent.scheduled_at <= now + timedelta(days=days), Application.deleted_at.is_(None)).order_by(ApplicationEvent.scheduled_at)).all()
        return [UpcomingEventResponse(id=event.id, application_id=application.id, company=application.company, role=application.role, event_type=event.event_type, title=event.title, scheduled_at=event.scheduled_at, status=event.status) for event, application in rows]

    def next_by_application(self, user_id: UUID, application_ids: list[UUID]) -> dict[UUID, ApplicationEvent]:
        if not application_ids:
            return {}
        rows = self.db.scalars(select(ApplicationEvent).where(ApplicationEvent.user_id == user_id, ApplicationEvent.application_id.in_(application_ids), ApplicationEvent.deleted_at.is_(None), ApplicationEvent.status == "upcoming").order_by(ApplicationEvent.scheduled_at))
        result: dict[UUID, ApplicationEvent] = {}
        for event in rows:
            result.setdefault(event.application_id, event)
        return result

    def _application(self, user_id: UUID, application_id: UUID) -> Application:
        application = self.db.scalar(select(Application).where(Application.id == application_id, Application.user_id == user_id, Application.deleted_at.is_(None)))
        if application is None:
            raise NotFoundError("Application")
        return application
