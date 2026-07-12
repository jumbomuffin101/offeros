import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.base import ResumeStatus
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.repositories.resumes import ResumeRepository
from app.schemas.resume import ResumeCreate, ResumeUpdate
from app.schemas.common import persistence_values
from app.services.resume_extraction import ExtractionResult
from app.services.resume_extraction import ResumeExtractionService
from app.services.validation import reject_null_fields


logger = logging.getLogger(__name__)


class ResumeService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ResumeRepository(db)

    def list(self, user_id: UUID) -> list[ResumeVersion]:
        return self.repository.list(user_id)

    def get(self, user_id: UUID, resume_id: UUID) -> ResumeVersion:
        resume = self.repository.get(user_id, resume_id)
        if resume is None:
            raise NotFoundError("Resume")
        return resume

    def create(self, user_id: UUID, payload: ResumeCreate) -> ResumeVersion:
        resume = self.repository.create(user_id, persistence_values(payload))
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def update(self, user_id: UUID, resume_id: UUID, payload: ResumeUpdate) -> ResumeVersion:
        resume = self.get(user_id, resume_id)
        values = persistence_values(payload, exclude_unset=True)
        reject_null_fields(values, set(ResumeCreate.model_fields))
        self.repository.update(resume, values)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def duplicate(self, user_id: UUID, resume_id: UUID) -> ResumeVersion:
        resume = self.get(user_id, resume_id)
        values = {
            "name": f"{resume.name} Copy",
            "target_role": resume.target_role,
            "description": resume.description,
            "status": ResumeStatus.DRAFT,
            "keyword_match_score": resume.keyword_match_score,
            "tags": list(resume.tags),
            "strengths": list(resume.strengths),
            "weaknesses": list(resume.weaknesses),
            "missing_keywords": list(resume.missing_keywords),
            "suggested_improvement": resume.suggested_improvement,
            "notes": resume.notes,
            "file_name": resume.file_name,
            "original_file_name": resume.original_file_name,
            "extracted_text": resume.extracted_text,
            "text_extraction_status": resume.text_extraction_status,
            "text_extraction_error": resume.text_extraction_error,
            "extracted_at": resume.extracted_at,
            "extraction_character_count": resume.extraction_character_count,
        }
        duplicate = self.repository.create(user_id, values)
        self.db.commit()
        self.db.refresh(duplicate)
        return duplicate

    def delete(self, user_id: UUID, resume_id: UUID) -> None:
        resume = self.get(user_id, resume_id)
        now = datetime.now(UTC)
        analyses = self.db.scalars(
            select(ResumeAnalysis).where(
                ResumeAnalysis.user_id == user_id,
                ResumeAnalysis.resume_version_id == resume.id,
                ResumeAnalysis.deleted_at.is_(None),
            )
        )
        for analysis in analyses:
            analysis.deleted_at = now
        self.repository.soft_delete(resume)
        self.db.commit()

    def upload(
        self,
        user_id: UUID,
        resume_id: UUID,
        *,
        filename: str,
        content_type: str | None,
        content: bytes,
    ) -> tuple[ResumeVersion, ExtractionResult]:
        resume = self.get(user_id, resume_id)
        extractor = ResumeExtractionService()
        validated = extractor.validate(filename=filename, content_type=content_type, content=content)
        try:
            extraction = extractor.extract(validated)
        except Exception as exc:
            logger.exception(
                "Resume text extraction failed for resume_id=%s user_id=%s filename=%s extension=%s",
                resume_id,
                user_id,
                validated.filename,
                validated.extension,
            )
            resume.original_file_name = validated.filename
            resume.file_name = validated.filename
            resume.text_extraction_status = "failed"
            resume.text_extraction_error = str(exc) or "Unable to extract readable text from this resume file."
            resume.extraction_character_count = 0
            self.db.commit()
            raise
        resume.original_file_name = validated.filename
        resume.file_name = validated.filename
        resume.extracted_text = extraction.text
        resume.text_extraction_status = "parsed"
        resume.text_extraction_error = ""
        resume.extracted_at = datetime.now(UTC)
        resume.extraction_character_count = extraction.character_count
        self.db.commit()
        self.db.refresh(resume)
        return resume, extraction
