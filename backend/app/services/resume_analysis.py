import logging
from datetime import UTC, datetime
from hashlib import sha256
from time import perf_counter
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.application import Application
from app.schemas.resume_analysis import ResumeAnalysisCreate, ResumeIntelligence, ResumePerformanceSummary
from app.career_intelligence.observations import CareerObservationService
from app.career_intelligence.repository import CareerIntelligenceRepository
from app.services.ai_resume_analysis import provider_from_settings
from app.services.resumes import ResumeService
from app.services.resume_intelligence import (
    ResumeCareerContextBuilder,
    analysis_mode,
    build_resume_intelligence,
    calculate_resume_performance,
    deterministic_signals,
    find_comparable_analysis,
    role_family,
)
from app.services.resume_summary import apply_latest_analysis_summary, clear_latest_analysis_summary


logger = logging.getLogger(__name__)


class ResumeAnalysisService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def analyze(
        self,
        user_id: UUID,
        resume_id: UUID,
        payload: ResumeAnalysisCreate,
        *,
        application: Application | None = None,
    ) -> tuple[ResumeAnalysis, ResumeVersion]:
        resume = ResumeService(self.db).get(user_id, resume_id)
        request_id = payload.analysis_request_id or uuid4()
        existing = self.db.scalar(
            select(ResumeAnalysis).where(
                ResumeAnalysis.user_id == user_id,
                ResumeAnalysis.analysis_request_id == request_id,
                ResumeAnalysis.deleted_at.is_(None),
            )
        )
        if existing is not None:
            if existing.resume_version_id != resume.id:
                raise ValidationError("This analysis request belongs to a different saved resume.")
            if application is not None and application.resume_analysis_id != existing.id:
                application.resume_analysis_id = existing.id
                self.db.commit()
                self.db.refresh(application)
            return existing, resume
        resume_text = (payload.resume_text or resume.extracted_text or "").strip()
        if not resume_text:
            raise ValidationError("Upload a resume file or paste resume text before running AI analysis.")
        job_description = payload.job_description.strip()
        mode = "application" if application is not None else (payload.analysis_mode or analysis_mode(application, payload.target_role, job_description))
        if mode != "general" and len(job_description) < 80:
            raise ValidationError("Paste a target job description before running job-specific resume analysis.")
        prior_analyses = list(
            self.db.scalars(
                select(ResumeAnalysis)
                .where(
                    ResumeAnalysis.user_id == user_id,
                    ResumeAnalysis.resume_version_id == resume.id,
                    ResumeAnalysis.deleted_at.is_(None),
                    ResumeAnalysis.status == "completed",
                )
                .order_by(ResumeAnalysis.created_at.desc())
                .limit(12)
            )
        )
        prior, comparison_status, comparison_basis, comparison_confidence = find_comparable_analysis(
            prior_analyses,
            current_mode=mode,
            target_role=payload.target_role,
            application_id=application.id if application else None,
        )
        performance = calculate_resume_performance(
            self.db, user_id, resume.id, role_family(payload.target_role)
        )
        signals = deterministic_signals(
            resume, resume_text, prior_analyses, performance, application
        )
        try:
            career_context = ResumeCareerContextBuilder(self.db).build(
                user_id,
                resume,
                target_role=payload.target_role,
                company_name=(payload.company_name or "").strip(),
                application=application,
                mode=mode,
            )
        except Exception:
            logger.warning(
                "resume_intelligence.context_unavailable user_id=%s resume_id=%s",
                user_id,
                resume.id,
                exc_info=self.settings.app_env != "production",
            )
            career_context = {
                "version": "resume-intelligence-v1",
                "generated_at": datetime.now(UTC).isoformat(),
                "status": "unavailable",
            }

        provider = provider_from_settings(self.settings)
        analysis_started_at = perf_counter()
        result = provider.analyze(
            resume_text=resume_text,
            target_role=payload.target_role.strip(),
            job_description=job_description or "General software engineering resume readiness assessment.",
            career_context=career_context,
            deterministic_signals=signals,
        )
        logger.info(
            "Resume analysis provider completed in %d ms (provider=%s model=%s)",
            round((perf_counter() - analysis_started_at) * 1000),
            provider.provider,
            provider.model,
        )
        try:
            if payload.resume_text and payload.resume_text.strip() != (resume.extracted_text or "").strip():
                resume.extracted_text = payload.resume_text.strip()
                resume.original_file_name = resume.original_file_name or resume.file_name
                resume.text_extraction_status = "manual"
                resume.text_extraction_error = ""
                resume.extracted_at = datetime.now(UTC)
                resume.extraction_character_count = len(resume.extracted_text)

            try:
                intelligence = build_resume_intelligence(
                    result=result,
                    resume=resume,
                    context=career_context,
                    prior=prior,
                    comparison_status=comparison_status,
                    comparison_basis=comparison_basis,
                    comparison_confidence=comparison_confidence,
                    signals=signals,
                    performance=performance,
                    mode=mode,
                    application=application,
                    simulated=provider.provider == "mock",
                )
            except Exception:
                logger.warning(
                    "resume_intelligence.reconciliation_unavailable user_id=%s resume_id=%s",
                    user_id,
                    resume.id,
                    exc_info=self.settings.app_env != "production",
                )
                intelligence = ResumeIntelligence(
                    analysis_mode=mode,
                    application_id=application.id if application else None,
                    performance=ResumePerformanceSummary(),
                    status="unavailable",
                    simulated=provider.provider == "mock",
                )
            analysis = ResumeAnalysis(
                user_id=user_id,
                resume_version_id=resume.id,
                analysis_request_id=request_id,
                company_name=(payload.company_name or "").strip(),
                target_role=payload.target_role.strip(),
                job_description=job_description,
                input_resume_hash=resume_hash(resume_text),
                provider=provider.provider,
                model=provider.model,
                status="completed",
                intelligence_json=intelligence.model_dump(mode="json"),
                **result.model_dump(),
            )
            self.db.add(analysis)
            self.db.flush()
            apply_latest_analysis_summary(resume, analysis)
            if application is not None:
                application.resume_analysis_id = analysis.id
            try:
                with self.db.begin_nested():
                    snapshot = CareerIntelligenceRepository(self.db).snapshot(user_id)
                    CareerObservationService(self.db, datetime.now(UTC)).reconcile(user_id, snapshot)
            except Exception:
                logger.warning(
                    "resume_intelligence.observation_reconciliation_failed user_id=%s resume_id=%s",
                    user_id,
                    resume.id,
                    exc_info=self.settings.app_env != "production",
                )
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(analysis)
        self.db.refresh(resume)
        if application is not None:
            self.db.refresh(application)
        return analysis, resume

    def list_for_resume(self, user_id: UUID, resume_id: UUID) -> list[ResumeAnalysis]:
        ResumeService(self.db).get(user_id, resume_id)
        statement = (
            select(ResumeAnalysis)
            .where(
                ResumeAnalysis.user_id == user_id,
                ResumeAnalysis.resume_version_id == resume_id,
                ResumeAnalysis.deleted_at.is_(None),
            )
            .order_by(ResumeAnalysis.created_at.desc())
        )
        return list(self.db.scalars(statement))

    def get(self, user_id: UUID, analysis_id: UUID) -> ResumeAnalysis:
        statement = select(ResumeAnalysis).where(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == user_id,
            ResumeAnalysis.deleted_at.is_(None),
        )
        analysis = self.db.scalar(statement)
        if analysis is None:
            raise NotFoundError("Resume analysis")
        return analysis

    def delete(self, user_id: UUID, analysis_id: UUID) -> None:
        analysis = self.get(user_id, analysis_id)
        resume = ResumeService(self.db).get(user_id, analysis.resume_version_id)
        analysis.deleted_at = datetime.now(UTC)
        latest = self.db.scalar(
            select(ResumeAnalysis)
            .where(
                ResumeAnalysis.user_id == user_id,
                ResumeAnalysis.resume_version_id == analysis.resume_version_id,
                ResumeAnalysis.deleted_at.is_(None),
                ResumeAnalysis.id != analysis.id,
                ResumeAnalysis.status == "completed",
            )
            .order_by(ResumeAnalysis.created_at.desc())
        )
        if latest is None:
            clear_latest_analysis_summary(resume)
        else:
            apply_latest_analysis_summary(resume, latest)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise


def resume_hash(value: str) -> str:
    normalized = " ".join(value.split()).lower()
    return sha256(normalized.encode("utf-8")).hexdigest()
