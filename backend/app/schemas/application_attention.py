from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


AttentionCategory = Literal[
    "follow_up_due",
    "stale_application",
    "missing_resume",
    "missing_job_description",
    "needs_resume_analysis",
    "needs_prep_plan",
    "oa_deadline_soon",
    "interview_soon",
    "offer_deadline_soon",
    "low_prep_readiness",
    "gmail_review",
]


class ApplicationAttentionItem(BaseModel):
    id: str
    application_id: UUID
    company: str
    role: str
    category: AttentionCategory
    priority: int = Field(ge=0, le=100)
    title: str
    description: str
    due_at: datetime | None = None
    created_at: datetime
    suggested_action: str
    last_meaningful_activity: datetime | None = None
    days_since_update: int = 0
    follow_up_count: int = 0
    days_to_first_response: int | None = None
    days_from_interview_to_outcome: int | None = None
    signal_key: str


class ApplicationAttentionSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    total: int = 0


class ApplicationInboxResponse(BaseModel):
    items: list[ApplicationAttentionItem] = Field(default_factory=list)
    summary: ApplicationAttentionSummary


class ApplicationAttentionOverrideRequest(BaseModel):
    application_id: UUID
    category: AttentionCategory
    action: Literal["dismiss", "snooze"]
    duration: Literal["tomorrow", "3_days", "1_week"] | None = None
