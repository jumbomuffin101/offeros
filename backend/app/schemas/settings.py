from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import ORMModel


class UserSettingsUpdate(ORMModel):
    theme: str | None = Field(default=None, pattern="^(dark|light|system)$")
    notifications_enabled: bool | None = None
    default_resume_version_id: UUID | None = None
    default_run_resume_analysis: bool | None = None
    default_generate_prep_plan: bool | None = None
    default_application_status: str | None = Field(default=None, pattern="^(wishlist|applying|applied)$")
    onboarding_status: str | None = Field(default=None, pattern="^(not_started|in_progress|completed|skipped)$")
    onboarding_step: int | None = Field(default=None, ge=1, le=6)
    weekly_application_goal: int | None = Field(default=None, ge=0, le=100)
    weekly_coding_goal: int | None = Field(default=None, ge=0, le=100)
    weekly_mock_interview_goal: int | None = Field(default=None, ge=0, le=20)
    weekly_follow_up_goal: int | None = Field(default=None, ge=0, le=100)
    default_interview_difficulty: str | None = Field(default=None, pattern="^(introductory|standard|challenging)$")
    default_mock_interview_length: int | None = Field(default=None, ge=3, le=10)


class UserSettingsResponse(ORMModel):
    id: UUID
    user_id: UUID
    theme: str
    notifications_enabled: bool
    default_resume_version_id: UUID | None
    default_run_resume_analysis: bool
    default_generate_prep_plan: bool
    default_application_status: str
    onboarding_status: str
    onboarding_step: int
    onboarding_completed_at: datetime | None
    onboarding_skipped_at: datetime | None
    first_resume_uploaded_at: datetime | None
    first_application_created_at: datetime | None
    first_analysis_completed_at: datetime | None
    first_prep_plan_created_at: datetime | None
    weekly_application_goal: int
    weekly_coding_goal: int
    weekly_mock_interview_goal: int
    weekly_follow_up_goal: int
    default_interview_difficulty: str
    default_mock_interview_length: int
    created_at: datetime
    updated_at: datetime
