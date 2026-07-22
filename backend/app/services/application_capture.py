import re
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ValidationError
from app.models.application import Application
from app.models.base import ApplicationStatus
from app.models.resume import ResumeVersion
from app.models.settings import UserSettings
from app.schemas.application import (
    ApplicationCaptureRequest,
    ApplicationCaptureResponse,
    CaptureApplicationSummary,
)
from app.services.application_duplicates import (
    ApplicationDuplicateService,
    normalize_job_url,
)


class ApplicationCaptureService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def capture(
        self, user_id: UUID, payload: ApplicationCaptureRequest
    ) -> ApplicationCaptureResponse:
        company, role = clean_text(payload.company), clean_text(payload.role)
        job_url = normalize_job_url(str(payload.job_url))
        source = clean_text(payload.source or "other").lower()
        external_id = clean_text(payload.external_job_id or "") or None
        existing = ApplicationDuplicateService(self.db).find(
            user_id,
            job_url=job_url,
            source=source,
            external_job_id=external_id,
            company=company,
            role=role,
        )
        if existing:
            return self._response("duplicate", existing)
        settings = self.db.scalar(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        resume_id = (
            payload.resume_version_id
            if "resume_version_id" in payload.model_fields_set
            else (settings.default_resume_version_id if settings else None)
        )
        resume = None
        if resume_id:
            resume = self.db.scalar(
                select(ResumeVersion).where(
                    ResumeVersion.id == resume_id,
                    ResumeVersion.user_id == user_id,
                    ResumeVersion.deleted_at.is_(None),
                )
            )
            if resume is None:
                raise ValidationError("Select a resume owned by your OfferOS account.")
        valid_statuses = {item.value for item in ApplicationStatus}
        status = (
            ApplicationStatus(settings.default_application_status)
            if settings and settings.default_application_status in valid_statuses
            else ApplicationStatus.WISHLIST
        )
        application = Application(
            user_id=user_id,
            company=company,
            role=role,
            location=clean_text(payload.location or ""),
            status=status,
            source=source,
            external_job_id=external_id,
            captured_at=datetime.now(UTC),
            job_url=job_url,
            job_description=clean_description(payload.job_description or ""),
            resume_version_id=resume.id if resume else None,
            resume_used=resume.name if resume else "",
        )
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return self._response("created", application)

    @staticmethod
    def _response(status: str, application: Application) -> ApplicationCaptureResponse:
        application_status = (
            application.status.value
            if hasattr(application.status, "value")
            else str(application.status)
        )
        return ApplicationCaptureResponse(
            status=status,
            application=CaptureApplicationSummary(
                id=application.id,
                company=application.company,
                role=application.role,
                location=application.location or None,
                job_url=str(application.job_url or ""),
                status=application_status,
                resume_version_id=application.resume_version_id,
                resume_match_score=None,
            ),
            analysis=None,
            prep_plan=None,
        )


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def clean_description(value: str) -> str:
    normalized = re.sub(r"[ \t]+", " ", value)
    return re.sub(r"\n{3,}", "\n\n", normalized).strip()[:40_000]
