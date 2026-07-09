from datetime import datetime
from uuid import UUID

from typing import Any

from pydantic import Field, field_validator

from app.schemas.common import NonEmptyStr, ORMModel


class WeakBullet(ORMModel):
    original: str = ""
    issue: str = ""
    suggestion: str = ""


class BulletRewrite(ORMModel):
    original: str = ""
    rewrite: str = ""
    why_better: str = ""


class ResumeAnalysisCreate(ORMModel):
    target_role: NonEmptyStr = Field(max_length=200)
    job_description: str | None = Field(default="", max_length=40_000)
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
    weak_bullets: list[WeakBullet]
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

    @field_validator("weak_bullets", mode="before")
    @classmethod
    def normalize_weak_bullets(cls, value: object) -> object:
        if not isinstance(value, list):
            return []
        normalized: list[dict[str, str]] = []
        for item in value:
            if isinstance(item, str):
                normalized.append({
                    "original": item,
                    "issue": "This bullet needs clearer technical scope or impact.",
                    "suggestion": "Add technologies, ownership, and measurable outcome.",
                })
            elif isinstance(item, dict):
                normalized.append({
                    "original": str(item.get("original") or ""),
                    "issue": str(item.get("issue") or ""),
                    "suggestion": str(item.get("suggestion") or ""),
                })
        return normalized

    @field_validator("suggested_bullet_rewrites", mode="before")
    @classmethod
    def normalize_rewrites(cls, value: object) -> object:
        if not isinstance(value, list):
            return []
        normalized: list[dict[str, str]] = []
        for item in value:
            if isinstance(item, dict):
                normalized.append({
                    "original": str(item.get("original") or ""),
                    "rewrite": str(item.get("rewrite") or ""),
                    "why_better": str(item.get("why_better") or item.get("rationale") or ""),
                })
        return normalized


class ResumeAnalysisResult(ORMModel):
    overall_score: int = Field(default=0, ge=0, le=100)
    keyword_score: int = Field(default=0, ge=0, le=100)
    impact_score: int = Field(default=0, ge=0, le=100)
    clarity_score: int = Field(default=0, ge=0, le=100)
    technical_depth_score: int = Field(default=0, ge=0, le=100)
    missing_keywords: list[str] = Field(default_factory=list, max_length=30)
    strong_keywords: list[str] = Field(default_factory=list, max_length=30)
    weak_bullets: list[WeakBullet] = Field(default_factory=list, max_length=12)
    suggested_bullet_rewrites: list[BulletRewrite] = Field(default_factory=list, max_length=12)
    strengths: list[str] = Field(default_factory=list, max_length=12)
    risks: list[str] = Field(default_factory=list, max_length=12)
    recommendations: list[str] = Field(default_factory=list, max_length=12)
    summary: str = Field(default="", max_length=4_000)

    @field_validator(
        "overall_score",
        "keyword_score",
        "impact_score",
        "clarity_score",
        "technical_depth_score",
        mode="before",
    )
    @classmethod
    def clamp_score(cls, value: Any) -> int:
        try:
            score = int(round(float(value)))
        except (TypeError, ValueError):
            return 0
        return max(0, min(100, score))
