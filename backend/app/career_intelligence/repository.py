from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.coding import CodingActivity
from app.models.gmail import GmailApplicationSuggestion, GmailConnection
from app.models.mock_interview import MockInterviewSession
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.settings import UserSettings


@dataclass(slots=True)
class CareerSnapshot:
    applications: list[Application]
    events: list[ApplicationEvent]
    prep_plans: list[ApplicationPrepPlan]
    resumes: list[ResumeVersion]
    analyses: list[ResumeAnalysis]
    coding_problems: list[CodingProblem]
    coding_activity: list[CodingActivity]
    behavioral: list[BehavioralQuestion]
    system_design: list[SystemDesignPrompt]
    mock_interviews: list[MockInterviewSession]
    gmail_connection: GmailConnection | None
    gmail_suggestions: list[GmailApplicationSuggestion]
    settings: UserSettings | None


class CareerIntelligenceRepository:
    HISTORY_DAYS = 60

    def __init__(self, db: Session, now: datetime | None = None) -> None:
        self.db = db
        self.now = now or datetime.now(UTC)

    def snapshot(self, user_id: UUID) -> CareerSnapshot:
        threshold = self.now - timedelta(days=self.HISTORY_DAYS)
        applications = self._active(Application, user_id, 500)
        application_ids = [row.id for row in applications]
        resumes = self._active(ResumeVersion, user_id, 100)
        return CareerSnapshot(
            applications=applications,
            events=self._related(ApplicationEvent, user_id, threshold, application_ids, 800),
            prep_plans=self._plans(user_id, application_ids),
            resumes=resumes,
            analyses=self._analyses(user_id, [row.id for row in resumes], 200),
            coding_problems=self._active(CodingProblem, user_id, 300),
            coding_activity=self._recent(CodingActivity, user_id, threshold, 300),
            behavioral=self._active(BehavioralQuestion, user_id, 300),
            system_design=self._active(SystemDesignPrompt, user_id, 200),
            mock_interviews=self._recent(MockInterviewSession, user_id, threshold, 100),
            gmail_connection=self.db.scalar(select(GmailConnection).where(GmailConnection.user_id == user_id)),
            gmail_suggestions=list(self.db.scalars(select(GmailApplicationSuggestion).where(
                GmailApplicationSuggestion.user_id == user_id,
                GmailApplicationSuggestion.status == "pending",
            ).order_by(GmailApplicationSuggestion.created_at.desc()).limit(100))),
            settings=self.db.scalar(select(UserSettings).where(UserSettings.user_id == user_id)),
        )

    def _active(self, model: type, user_id: UUID, limit: int) -> list:
        statement = select(model).where(model.user_id == user_id)
        if hasattr(model, "deleted_at"):
            statement = statement.where(model.deleted_at.is_(None))
        return list(self.db.scalars(statement.order_by(model.updated_at.desc()).limit(limit)))

    def _recent(self, model: type, user_id: UUID, threshold: datetime, limit: int) -> list:
        return list(self.db.scalars(select(model).where(
            model.user_id == user_id, model.updated_at >= threshold
        ).order_by(model.updated_at.desc()).limit(limit)))

    def _related(self, model: type, user_id: UUID, threshold: datetime, ids: list[UUID], limit: int) -> list:
        if not ids:
            return []
        return list(self.db.scalars(select(model).where(
            model.user_id == user_id,
            model.application_id.in_(ids),
            model.deleted_at.is_(None),
            model.updated_at >= threshold,
        ).order_by(model.updated_at.desc()).limit(limit)))

    def _plans(self, user_id: UUID, ids: list[UUID]) -> list[ApplicationPrepPlan]:
        if not ids:
            return []
        return list(self.db.scalars(select(ApplicationPrepPlan).where(
            ApplicationPrepPlan.user_id == user_id,
            ApplicationPrepPlan.application_id.in_(ids),
        )))

    def _analyses(self, user_id: UUID, ids: list[UUID], limit: int) -> list[ResumeAnalysis]:
        if not ids:
            return []
        return list(self.db.scalars(select(ResumeAnalysis).where(
            ResumeAnalysis.user_id == user_id,
            ResumeAnalysis.resume_version_id.in_(ids),
            ResumeAnalysis.deleted_at.is_(None),
            ResumeAnalysis.status == "completed",
        ).order_by(ResumeAnalysis.updated_at.desc()).limit(limit)))
