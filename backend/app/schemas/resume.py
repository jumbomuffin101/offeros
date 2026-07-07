from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

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
    original_file_name: str = Field(default="", max_length=500)
    extracted_text: str = Field(default="", max_length=120_000)
    text_extraction_status: str = Field(default="not_started", max_length=40)
    text_extraction_error: str = Field(default="", max_length=2_000)


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
    original_file_name: str | None = Field(default=None, max_length=500)
    extracted_text: str | None = Field(default=None, max_length=120_000)
    text_extraction_status: str | None = Field(default=None, max_length=40)
    text_extraction_error: str | None = Field(default=None, max_length=2_000)


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
    original_file_name: str
    extracted_text: str
    text_extraction_status: str
    text_extraction_error: str
    created_at: datetime
    updated_at: datetime

    @field_validator(
        "description",
        "suggested_improvement",
        "notes",
        "file_name",
        "original_file_name",
        "extracted_text",
        "text_extraction_error",
        mode="before",
    )
    @classmethod
    def _string_default(cls, value: Any) -> str:
        return "" if value is None else str(value)

    @field_validator("text_extraction_status", mode="before")
    @classmethod
    def _text_extraction_status_default(cls, value: Any) -> str:
        allowed = {"not_started", "manual", "parsed", "failed"}
        status = "" if value is None else str(value)
        return status if status in allowed else "not_started"

    @field_validator("tags", "strengths", "weaknesses", "missing_keywords", mode="before")
    @classmethod
    def _list_default(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value if item is not None]
        return []

    @field_validator("keyword_match_score", mode="before")
    @classmethod
    def _score_default(cls, value: Any) -> int:
        if value is None:
            return 0
        try:
            return max(0, min(100, int(value)))
        except (TypeError, ValueError):
            return 0

    @field_validator("status", mode="before")
    @classmethod
    def _status_default(cls, value: Any) -> ResumeStatus:
        if isinstance(value, ResumeStatus):
            return value
        try:
            return ResumeStatus(str(value).lower())
        except ValueError:
            return ResumeStatus.DRAFT
