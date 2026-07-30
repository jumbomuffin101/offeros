from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.application_attention import ApplicationAttentionItem
from app.schemas.application_event import UpcomingEventResponse
from app.schemas.common import ORMModel
from app.career_intelligence.schemas import CareerHealth, CareerRecommendation, CareerTrend


class NotificationCreate(ORMModel):
    type: str
    title: str
    message: str
    application_id: UUID | None = None
    action_url: str | None = None
    action_label: str | None = None
    expires_at: datetime | None = None
    dedupe_key: str | None = None


class NotificationResponse(NotificationCreate):
    id: UUID
    read_at: datetime | None
    created_at: datetime


class NotificationListResponse(ORMModel):
    items: list[NotificationResponse] = Field(default_factory=list)
    unread_count: int = 0


class TodayTopAction(ORMModel):
    type: str
    title: str
    description: str
    application_id: UUID | None = None
    priority: int
    action_label: str
    action_url: str


class TodayWeeklyProgress(ORMModel):
    applications_added: int = 0
    coding_problems: int = 0
    mock_interviews: int = 0
    follow_ups_completed: int = 0
    prep_tasks: int = 0
    goals: dict[str, int] = Field(default_factory=dict)


class TodayResponse(ORMModel):
    generated_at: datetime
    workspace_status: Literal["ready", "partial"] = "ready"
    date: date
    top_action: TodayTopAction | None
    attention_items: list[ApplicationAttentionItem] = Field(default_factory=list)
    upcoming_events: list[UpcomingEventResponse] = Field(default_factory=list)
    weekly_progress: TodayWeeklyProgress
    pipeline: dict[str, int] = Field(default_factory=dict)
    recent_activity: list[dict[str, str]] = Field(default_factory=list)
    resume_performance: dict[str, object] = Field(default_factory=dict)
    gmail: dict[str, object] = Field(default_factory=dict)
    notifications: dict[str, int] = Field(default_factory=dict)
    sections: dict[str, str] = Field(default_factory=dict)
    career_health: CareerHealth | None = None
    career_priorities: list[CareerRecommendation] = Field(default_factory=list)
    improvement_signal: CareerTrend | None = None
    risk_signal: str | None = None


class UsageOperationSummary(ORMModel):
    operation: str
    used: int
    limit: int
    resets_at: datetime


class UsageSummaryResponse(ORMModel):
    operations: list[UsageOperationSummary] = Field(default_factory=list)


class AccountDeleteRequest(ORMModel):
    confirmation: Literal["DELETE"]


class ReadinessResponse(ORMModel):
    status: Literal["ready", "not_ready"]
    environment: str
    database: Literal["reachable", "unreachable"]
    auth_configured: bool
    ai_configured: bool
