from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.resume import ResumeVersion


class ResumeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, user_id: UUID) -> list[ResumeVersion]:
        statement = (
            select(ResumeVersion)
            .where(ResumeVersion.user_id == user_id, ResumeVersion.deleted_at.is_(None))
            .order_by(ResumeVersion.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def get(self, user_id: UUID, resume_id: UUID) -> ResumeVersion | None:
        statement = select(ResumeVersion).where(
            ResumeVersion.id == resume_id,
            ResumeVersion.user_id == user_id,
            ResumeVersion.deleted_at.is_(None),
        )
        return self.db.scalar(statement)

    def create(self, user_id: UUID, values: dict[str, object]) -> ResumeVersion:
        resume = ResumeVersion(user_id=user_id, **values)
        self.db.add(resume)
        self.db.flush()
        return resume

    def update(self, resume: ResumeVersion, values: dict[str, object]) -> ResumeVersion:
        for field, value in values.items():
            setattr(resume, field, value)
        self.db.flush()
        return resume

    def soft_delete(self, resume: ResumeVersion) -> None:
        resume.deleted_at = datetime.now(UTC)
        self.db.flush()
