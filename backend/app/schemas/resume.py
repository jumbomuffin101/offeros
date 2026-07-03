from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.base import ResumeStatus
from app.schemas.common import NonEmptyStr, ORMModel


class ResumeCreate(ORMModel):
    name: NonEmptyStr = Field(max_length=200)
    target_role: NonEmptyStr = Field(max_length=200)
    description: str = Field(default="", max_length=20_000)
    status: ResumeStatus = ResumeStatus.DRAFT
    keyword_match_score: int = Field(default=0, ge=0, le=100)
    tags: list[str] = Field(default_factory=list, max_length=50)
    strengths: list[str] = Field(default_factory=list, max_length=50)
    weaknesses: list[str] = Field(default_factory=list, max_length=50)
    missing_keywords: list[str] = Field(default_factory=list, max_length=100)
    suggested_improvement: str = Field(default="", max_length=20_000)
    notes: str = Field(default="", max_length=20_000)
    file_name: str = Field(default="", max_length=500)


class ResumeUpdate(ORMModel):
    name: NonEmptyStr | None = Field(default=None, max_length=200)
    target_role: NonEmptyStr | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    status: ResumeStatus | None = None
    keyword_match_score: int | None = Field(default=None, ge=0, le=100)
    tags: list[str] | None = Field(default=None, max_length=50)
    strengths: list[str] | None = Field(default=None, max_length=50)
    weaknesses: list[str] | None = Field(default=None, max_length=50)
    missing_keywords: list[str] | None = Field(default=None, max_length=100)
    suggested_improvement: str | None = Field(default=None, max_length=20_000)
    notes: str | None = Field(default=None, max_length=20_000)
    file_name: str | None = Field(default=None, max_length=500)


class ResumeResponse(ORMModel):
    id: UUID
    user_id: UUID
    name: str
    target_role: str
    description: str
    status: ResumeStatus
    keyword_match_score: int
    tags: list[str]
    strengths: list[str]
    weaknesses: list[str]
    missing_keywords: list[str]
    suggested_improvement: str
    notes: str
    file_name: str
    created_at: datetime
    updated_at: datetime
