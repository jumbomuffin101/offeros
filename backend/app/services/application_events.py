from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.schemas.application_event import (
    ApplicationEventCreate,
    ApplicationEventResponse,
    ApplicationEventUpdate,
    FocusResponse,
    UpcomingEventResponse,
)
from app.schemas.common import persistence_values
from app.services.application_prep import ApplicationPrepService
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

    def focus(self, user_id: UUID) -> FocusResponse | None:
        now = datetime.now(UTC)
        rows = self.db.execute(select(ApplicationEvent, Application).join(Application, Application.id == ApplicationEvent.application_id).where(ApplicationEvent.user_id == user_id, ApplicationEvent.deleted_at.is_(None), ApplicationEvent.status == "upcoming", Application.deleted_at.is_(None)).order_by(ApplicationEvent.scheduled_at)).all()
        candidates: list[tuple[int, ApplicationEvent, Application]] = []
        for event, application in rows:
            hours = (_as_utc(event.scheduled_at) - now).total_seconds() / 3600
            priority = event_priority(event.event_type, hours)
            if priority:
                candidates.append((priority, event, application))
        if candidates:
            priority, event, application = max(candidates, key=lambda item: (item[0], -_as_utc(item[1].scheduled_at).timestamp()))
            plan = self.db.scalar(select(ApplicationPrepPlan).where(ApplicationPrepPlan.user_id == user_id, ApplicationPrepPlan.application_id == application.id))
            coverage = ApplicationPrepService(self.db).get(user_id, application.id) if plan else None
            return FocusResponse(type=event.event_type, application_id=application.id, title=f"{application.company} - {application.role}", subtitle=event.title, due_at=event.scheduled_at, priority=priority, prep_readiness=coverage.overall_readiness if coverage else None, prep_next_action=plan.next_best_action if plan else None)
        plan_row = self.db.execute(select(ApplicationPrepPlan, Application).join(Application, Application.id == ApplicationPrepPlan.application_id).where(ApplicationPrepPlan.user_id == user_id, ApplicationPrepPlan.status == "ready", Application.deleted_at.is_(None)).order_by(ApplicationPrepPlan.updated_at.desc())).first()
        if plan_row and plan_row[0].next_best_action:
            plan, application = plan_row
            coverage = ApplicationPrepService(self.db).get(user_id, application.id)
            return FocusResponse(type="prep", application_id=application.id, title=f"{application.company} - {application.role}", subtitle=plan.next_best_action, due_at=None, priority=50, prep_readiness=coverage.overall_readiness if coverage else None, prep_next_action=plan.next_best_action)
        stale_threshold = now - timedelta(days=7)
        stale = self.db.scalar(select(Application).where(Application.user_id == user_id, Application.deleted_at.is_(None), Application.priority == "high", Application.updated_at <= stale_threshold, Application.status.notin_(["offer", "rejected"])).order_by(Application.updated_at))
        return FocusResponse(type="stale_application", application_id=stale.id, title=f"{stale.company} - {stale.role}", subtitle="Review this high-priority application and set a next action.", due_at=None, priority=40) if stale else None

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


def event_priority(event_type: str, hours_until: float) -> int:
    if hours_until < 0:
        return 100
    if event_type == "oa_deadline" and hours_until <= 24:
        return 90
    if event_type in {"recruiter_screen", "technical_interview", "behavioral_interview", "system_design_interview", "final_round"} and hours_until <= 24:
        return 85
    if event_type == "offer_deadline" and hours_until <= 48:
        return 80
    if event_type in {"oa_deadline", "recruiter_screen", "technical_interview", "behavioral_interview", "system_design_interview", "final_round"} and hours_until <= 72:
        return 70
    if event_type == "follow_up" and hours_until <= 24:
        return 60
    return 0


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
