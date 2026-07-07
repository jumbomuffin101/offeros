from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import NonEmptyStr, ORMModel


class BulletRewrite(ORMModel):
    original: str = ""
    rewrite: str = ""
    rationale: str = ""


class ResumeAnalysisCreate(ORMModel):
    target_role: NonEmptyStr = Field(max_length=200)
    job_description: str = Field(default="", max_length=40_000)
    resume_text: str | None = Field(default=None, max_length=120_000)

    @field_validator("job_description", "resume_text", mode="before")
    @classmethod
    def normalize_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ResumeAnalysisResponse(ORMModel):
    id: UUID
    user_id: UUID
    resume_version_id: UUID
    target_role: str
    job_description: str
    overall_score: int
    keyword_score: int
    impact_score: int
    clarity_score: int
    technical_depth_score: int
    missing_keywords: list[str]
    strong_keywords: list[str]
    weak_bullets: list[str]
    suggested_bullet_rewrites: list[BulletRewrite]
    strengths: list[str]
    risks: list[str]
    recommendations: list[str]
    summary: str
    provider: str
    model: str
    status: str
    error_message: str
    created_at: datetime
    updated_at: datetime


class ResumeAnalysisResult(ORMModel):
    overall_score: int = Field(ge=0, le=100)
    keyword_score: int = Field(ge=0, le=100)
    impact_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    technical_depth_score: int = Field(ge=0, le=100)
    missing_keywords: list[str] = Field(default_factory=list, max_length=30)
    strong_keywords: list[str] = Field(default_factory=list, max_length=30)
    weak_bullets: list[str] = Field(default_factory=list, max_length=12)
    suggested_bullet_rewrites: list[BulletRewrite] = Field(default_factory=list, max_length=12)
    strengths: list[str] = Field(default_factory=list, max_length=12)
    risks: list[str] = Field(default_factory=list, max_length=12)
    recommendations: list[str] = Field(default_factory=list, max_length=12)
    summary: str = Field(default="", max_length=4_000)
