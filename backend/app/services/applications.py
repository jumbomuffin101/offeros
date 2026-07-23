from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.models.application import Application
from app.models.application_prep import ApplicationPrepPlan
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.repositories.applications import ApplicationRepository
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.schemas.resume_analysis import ResumeAnalysisCreate
from app.schemas.common import persistence_values
from app.services.resume_analysis import ResumeAnalysisService
from app.services.validation import reject_null_fields
from app.services.application_events import ApplicationEventService


class ApplicationService:
    def __init__(self, db: Session, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings
        self.repository = ApplicationRepository(db)

    def list(self, user_id: UUID) -> list[ApplicationResponse]:
        applications = self.repository.list(user_id)
        resumes, analyses = self._related_records(user_id, applications)
        next_events = ApplicationEventService(self.db).next_by_application(user_id, [item.id for item in applications])
        return [self._response(application, resumes, analyses, next_events.get(application.id)) for application in applications]

    def get(self, user_id: UUID, application_id: UUID) -> Application:
        application = self.repository.get(user_id, application_id)
        if application is None:
            raise NotFoundError("Application")
        return application

    def get_response(self, user_id: UUID, application_id: UUID) -> ApplicationResponse:
        application = self.get(user_id, application_id)
        next_event = ApplicationEventService(self.db).next_by_application(user_id, [application.id]).get(application.id)
        return self._response(application, next_event=next_event)

    def create(self, user_id: UUID, payload: ApplicationCreate) -> ApplicationResponse:
        values = self._validated_values(user_id, persistence_values(payload))
        application = self.repository.create(user_id, values)
        self.db.commit()
        self.db.refresh(application)
        return self.get_response(user_id, application.id)

    def update(
        self, user_id: UUID, application_id: UUID, payload: ApplicationUpdate
    ) -> ApplicationResponse:
        application = self.get(user_id, application_id)
        values = persistence_values(payload, exclude_unset=True)
        reject_null_fields(
            values,
            {
                "company",
                "role",
                "location",
                "status",
                "source",
                "resume_used",
                "job_description",
                "recruiter_name",
                "salary_range",
                "priority",
                "notes",
                "tags",
            },
        )
        values = self._validated_values(user_id, values, application=application)
        self.repository.update(application, values)
        if {"job_description", "resume_version_id", "resume_analysis_id"} & values.keys():
            plan = self.db.scalar(select(ApplicationPrepPlan).where(ApplicationPrepPlan.application_id == application.id))
            if plan is not None:
                plan.status = "stale"
        self.db.commit()
        self.db.refresh(application)
        return self.get_response(user_id, application.id)

    def analyze_resume(
        self, user_id: UUID, application_id: UUID, analysis_request_id: UUID | None
    ) -> tuple[ApplicationResponse, ResumeAnalysis]:
        application = self.get(user_id, application_id)
        if application.resume_version_id is None:
            raise ValidationError("Select a saved resume before analyzing this application.")
        if not application.job_description.strip():
            raise ValidationError("Add a job description before analyzing this application.")
        if self.settings is None:
            raise RuntimeError("Application analysis settings are unavailable.")
        analysis, _resume = ResumeAnalysisService(self.db, self.settings).analyze(
            user_id,
            application.resume_version_id,
            ResumeAnalysisCreate(
                target_role=application.role,
                company_name=application.company,
                job_description=application.job_description,
                analysis_request_id=analysis_request_id,
            ),
            application=application,
        )
        return self.get_response(user_id, application.id), analysis

    def delete(self, user_id: UUID, application_id: UUID) -> None:
        application = self.get(user_id, application_id)
        deleted_at = datetime.now(UTC)
        for event in ApplicationEventService(self.db).list(user_id, application_id):
            event.deleted_at = deleted_at
        self.repository.soft_delete(application)
        self.db.commit()

    def _validated_values(
        self, user_id: UUID, values: dict[str, object], *, application: Application | None = None
    ) -> dict[str, object]:
        resume_id = values.get("resume_version_id", application.resume_version_id if application else None)
        if "resume_version_id" in values:
            if resume_id is None:
                values["resume_used"] = ""
                values["resume_analysis_id"] = None
            else:
                resume = self.db.scalar(
                    select(ResumeVersion).where(
                        ResumeVersion.id == resume_id,
                        ResumeVersion.user_id == user_id,
                        ResumeVersion.deleted_at.is_(None),
                    )
                )
                if resume is None:
                    raise ValidationError("Select a saved resume from your workspace.")
                values["resume_used"] = resume.name

        if "resume_analysis_id" in values and values["resume_analysis_id"] is not None:
            analysis = self.db.scalar(
                select(ResumeAnalysis).where(
                    ResumeAnalysis.id == values["resume_analysis_id"],
                    ResumeAnalysis.user_id == user_id,
                    ResumeAnalysis.deleted_at.is_(None),
                )
            )
            if analysis is None or analysis.status != "completed" or analysis.resume_version_id != resume_id:
                raise ValidationError("The selected analysis does not belong to this application's resume.")
        return values

    def _related_records(
        self, user_id: UUID, applications: list[Application]
    ) -> tuple[dict[UUID, ResumeVersion], dict[UUID, ResumeAnalysis]]:
        resume_ids = [item.resume_version_id for item in applications if item.resume_version_id]
        analysis_ids = [item.resume_analysis_id for item in applications if item.resume_analysis_id]
        resumes = self.db.scalars(
            select(ResumeVersion).where(
                ResumeVersion.user_id == user_id,
                ResumeVersion.id.in_(resume_ids),
                ResumeVersion.deleted_at.is_(None),
            )
        ) if resume_ids else []
        analyses = self.db.scalars(
            select(ResumeAnalysis).where(
                ResumeAnalysis.user_id == user_id,
                ResumeAnalysis.id.in_(analysis_ids),
                ResumeAnalysis.deleted_at.is_(None),
            )
        ) if analysis_ids else []
        return ({resume.id: resume for resume in resumes}, {analysis.id: analysis for analysis in analyses})

    def _response(
        self,
        application: Application,
        resumes: dict[UUID, ResumeVersion] | None = None,
        analyses: dict[UUID, ResumeAnalysis] | None = None,
        next_event: object | None = None,
    ) -> ApplicationResponse:
        if resumes is None or analyses is None:
            resumes, analyses = self._related_records(application.user_id, [application])
        resume = resumes.get(application.resume_version_id) if application.resume_version_id else None
        analysis = analyses.get(application.resume_analysis_id) if application.resume_analysis_id else None
        values = ApplicationResponse.model_validate(application).model_dump()
        values.update({
            "selected_resume_name": resume.name if resume else None,
            "selected_resume_target_role": resume.target_role if resume else None,
            "analysis_status": analysis.status if analysis else None,
            "analysis_overall_score": analysis.overall_score if analysis else None,
            "analysis_keyword_score": analysis.keyword_score if analysis else None,
            "analysis_missing_keyword_count": len(analysis.missing_keywords or []) if analysis and isinstance(analysis.missing_keywords, list) else 0,
            "analysis_last_analyzed_at": analysis.created_at if analysis else None,
            "next_action": getattr(next_event, "title", None),
            "next_action_due_at": getattr(next_event, "scheduled_at", None),
            "next_event_type": getattr(next_event, "event_type", None),
        })
        return ApplicationResponse.model_validate(values)
