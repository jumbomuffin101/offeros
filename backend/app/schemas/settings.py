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


class UserSettingsResponse(ORMModel):
    id: UUID
    user_id: UUID
    theme: str
    notifications_enabled: bool
    default_resume_version_id: UUID | None
    default_run_resume_analysis: bool
    default_generate_prep_plan: bool
    default_application_status: str
    created_at: datetime
    updated_at: datetime
