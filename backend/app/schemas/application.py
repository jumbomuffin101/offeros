from datetime import date, datetime
from uuid import UUID

from pydantic import EmailStr, Field, HttpUrl

from app.models.base import ApplicationStatus, Priority
from app.schemas.common import NonEmptyStr, ORMModel
from app.schemas.resume_analysis import ResumeAnalysisResponse


class ApplicationCreate(ORMModel):
    company: NonEmptyStr = Field(max_length=200)
    role: NonEmptyStr = Field(max_length=200)
    location: str = Field(default="", max_length=200)
    status: ApplicationStatus = ApplicationStatus.WISHLIST
    date_applied: date | None = None
    deadline: date | None = None
    source: str = Field(default="", max_length=120)
    resume_used: str = Field(default="", max_length=200)
    resume_version_id: UUID | None = None
    resume_analysis_id: UUID | None = None
    job_description: str = Field(default="", max_length=40_000)
    job_url: HttpUrl | None = None
    recruiter_name: str = Field(default="", max_length=200)
    recruiter_email: EmailStr | None = None
    salary_range: str = Field(default="", max_length=200)
    priority: Priority = Priority.MEDIUM
    notes: str = Field(default="", max_length=20_000)
    tags: list[str] = Field(default_factory=list, max_length=50)


class ApplicationUpdate(ORMModel):
    company: NonEmptyStr | None = Field(default=None, max_length=200)
    role: NonEmptyStr | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    status: ApplicationStatus | None = None
    date_applied: date | None = None
    deadline: date | None = None
    source: str | None = Field(default=None, max_length=120)
    resume_used: str | None = Field(default=None, max_length=200)
    resume_version_id: UUID | None = None
    resume_analysis_id: UUID | None = None
    job_description: str | None = Field(default=None, max_length=40_000)
    job_url: HttpUrl | None = None
    recruiter_name: str | None = Field(default=None, max_length=200)
    recruiter_email: EmailStr | None = None
    salary_range: str | None = Field(default=None, max_length=200)
    priority: Priority | None = None
    notes: str | None = Field(default=None, max_length=20_000)
    tags: list[str] | None = Field(default=None, max_length=50)


class ApplicationResponse(ORMModel):
    id: UUID
    user_id: UUID
    company: str
    role: str
    location: str
    status: ApplicationStatus
    date_applied: date | None
    deadline: date | None
    source: str
    resume_used: str
    resume_version_id: UUID | None = None
    resume_analysis_id: UUID | None = None
    job_description: str = ""
    selected_resume_name: str | None = None
    selected_resume_target_role: str | None = None
    analysis_status: str | None = None
    analysis_overall_score: int | None = None
    analysis_keyword_score: int | None = None
    analysis_missing_keyword_count: int = 0
    analysis_last_analyzed_at: datetime | None = None
    job_url: str | None
    recruiter_name: str
    recruiter_email: str | None
    salary_range: str
    priority: Priority
    notes: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class ApplicationAnalyzeResumeRequest(ORMModel):
    analysis_request_id: UUID | None = None


class ApplicationAnalyzeResumeResponse(ORMModel):
    application: ApplicationResponse
    analysis: ResumeAnalysisResponse
