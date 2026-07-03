from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import ORMModel


class UserSettingsUpdate(ORMModel):
    theme: str | None = Field(default=None, pattern="^(dark|light|system)$")
    notifications_enabled: bool | None = None


class UserSettingsResponse(ORMModel):
    id: UUID
    user_id: UUID
    theme: str
    notifications_enabled: bool
    created_at: datetime
    updated_at: datetime
