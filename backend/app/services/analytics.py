from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.base import PrepStatus
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeVersion
from app.schemas.common import AnalyticsSummary


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def summary(self, user_id: UUID) -> AnalyticsSummary:
        statuses = self.db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.user_id == user_id, Application.deleted_at.is_(None))
            .group_by(Application.status)
        ).all()
        return AnalyticsSummary(
            total_applications=self._count(Application, user_id),
            application_statuses={status.value: count for status, count in statuses},
            total_resumes=self._count(ResumeVersion, user_id),
            completed_coding_problems=self._completed_count(CodingProblem, user_id),
            completed_behavioral_questions=self._completed_count(BehavioralQuestion, user_id),
            completed_system_design_prompts=self._completed_count(SystemDesignPrompt, user_id),
        )

    def _count(self, model: type, user_id: UUID) -> int:
        statement = select(func.count(model.id)).where(
            model.user_id == user_id, model.deleted_at.is_(None)
        )
        return int(self.db.scalar(statement) or 0)

    def _completed_count(self, model: type, user_id: UUID) -> int:
        statement = select(func.count(model.id)).where(
            model.user_id == user_id,
            model.deleted_at.is_(None),
            model.status == PrepStatus.COMPLETED,
        )
        return int(self.db.scalar(statement) or 0)
