from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.models.resume import ResumeAnalysis
from app.schemas.resume_analysis import ResumeAnalysisCreate
from app.services.ai_resume_analysis import provider_from_settings
from app.services.resumes import ResumeService


class ResumeAnalysisService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def analyze(self, user_id: UUID, resume_id: UUID, payload: ResumeAnalysisCreate) -> ResumeAnalysis:
        resume = ResumeService(self.db).get(user_id, resume_id)
        resume_text = (payload.resume_text or resume.extracted_text or "").strip()
        if not resume_text:
            raise ValidationError("Upload a resume file or paste resume text before running AI analysis.")
        job_description = payload.job_description.strip()
        if len(job_description) < 80:
            raise ValidationError("Paste a target job description before running job-specific resume analysis.")

        provider = provider_from_settings(self.settings)
        result = provider.analyze(
            resume_text=resume_text,
            target_role=payload.target_role.strip(),
            job_description=job_description,
        )
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
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

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
        analysis.deleted_at = datetime.now(UTC)
        self.db.commit()


def resume_hash(value: str) -> str:
    normalized = " ".join(value.split()).lower()
    return sha256(normalized.encode("utf-8")).hexdigest()
