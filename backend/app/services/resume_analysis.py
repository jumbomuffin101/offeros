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
from app.schemas.resume_analysis import ResumeAnalysisCreate
from app.services.ai_resume_analysis import provider_from_settings
from app.services.resumes import ResumeService


logger = logging.getLogger(__name__)


class ResumeAnalysisService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def analyze(self, user_id: UUID, resume_id: UUID, payload: ResumeAnalysisCreate) -> tuple[ResumeAnalysis, ResumeVersion]:
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
            return existing, resume
        resume_text = (payload.resume_text or resume.extracted_text or "").strip()
        if not resume_text:
            raise ValidationError("Upload a resume file or paste resume text before running AI analysis.")
        job_description = payload.job_description.strip()
        if len(job_description) < 80:
            raise ValidationError("Paste a target job description before running job-specific resume analysis.")

        provider = provider_from_settings(self.settings)
        analysis_started_at = perf_counter()
        result = provider.analyze(
            resume_text=resume_text,
            target_role=payload.target_role.strip(),
            job_description=job_description,
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
                **result.model_dump(),
            )
            self.db.add(analysis)
            self.db.flush()
            apply_latest_analysis_summary(resume, analysis)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(analysis)
        self.db.refresh(resume)
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


def apply_latest_analysis_summary(resume: ResumeVersion, analysis: ResumeAnalysis) -> None:
    resume.keyword_match_score = analysis.keyword_score
    resume.strengths = list(analysis.strengths or [])[:12]
    resume.weaknesses = list(analysis.risks or [])[:12]
    resume.missing_keywords = list(analysis.missing_keywords or [])[:30]
    resume.suggested_improvement = "\n".join(list(analysis.recommendations or [])[:5]) or analysis.summary
    resume.last_analyzed_at = analysis.created_at or datetime.now(UTC)
    resume.latest_analysis_id = analysis.id
    resume.latest_overall_score = analysis.overall_score
    resume.latest_analysis_target_role = analysis.target_role
    resume.latest_analysis_company = analysis.company_name
    resume.analysis_status = analysis.status


def clear_latest_analysis_summary(resume: ResumeVersion) -> None:
    resume.keyword_match_score = 0
    resume.strengths = []
    resume.weaknesses = []
    resume.missing_keywords = []
    resume.suggested_improvement = ""
    resume.last_analyzed_at = None
    resume.latest_analysis_id = None
    resume.latest_overall_score = None
    resume.latest_analysis_target_role = ""
    resume.latest_analysis_company = ""
    resume.analysis_status = ""
