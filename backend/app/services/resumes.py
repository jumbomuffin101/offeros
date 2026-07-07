from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.base import ResumeStatus
from app.models.resume import ResumeVersion
from app.repositories.resumes import ResumeRepository
from app.schemas.resume import ResumeCreate, ResumeUpdate
from app.schemas.common import persistence_values
from app.services.validation import reject_null_fields


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
        }
        duplicate = self.repository.create(user_id, values)
        self.db.commit()
        self.db.refresh(duplicate)
        return duplicate

    def delete(self, user_id: UUID, resume_id: UUID) -> None:
        resume = self.get(user_id, resume_id)
        self.repository.soft_delete(resume)
        self.db.commit()
