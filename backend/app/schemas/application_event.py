from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import NonEmptyStr, ORMModel

EventType = Literal["applied", "oa_received", "oa_deadline", "oa_completed", "recruiter_screen", "technical_interview", "behavioral_interview", "system_design_interview", "final_round", "follow_up", "offer_received", "offer_deadline", "rejected", "withdrawn", "custom"]
EventStatus = Literal["upcoming", "completed", "canceled"]
EventSource = Literal["manual", "application", "calendar", "future_email"]


class ApplicationEventCreate(ORMModel):
    event_type: EventType
    title: NonEmptyStr = Field(max_length=240)
    description: str = Field(default="", max_length=10_000)
    scheduled_at: datetime
    status: EventStatus = "upcoming"
    source: EventSource = "manual"


class ApplicationEventUpdate(ORMModel):
    event_type: EventType | None = None
    title: NonEmptyStr | None = Field(default=None, max_length=240)
    description: str | None = Field(default=None, max_length=10_000)
    scheduled_at: datetime | None = None
    status: EventStatus | None = None


class ApplicationEventResponse(ORMModel):
    id: UUID
    user_id: UUID
    application_id: UUID
    event_type: EventType
    title: str
    description: str
    scheduled_at: datetime
    completed_at: datetime | None
    status: EventStatus
    source: EventSource
    external_calendar_event_id: str | None
    created_at: datetime
    updated_at: datetime


class UpcomingEventResponse(ORMModel):
    id: UUID
    application_id: UUID
    company: str
    role: str
    event_type: str
    title: str
    scheduled_at: datetime
    status: str


class FocusResponse(ORMModel):
    type: str
    application_id: UUID
    title: str
    subtitle: str
    due_at: datetime | None
    priority: int
    prep_readiness: int | None = None
    prep_next_action: str | None = None
