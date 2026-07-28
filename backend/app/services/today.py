from datetime import UTC, datetime, timedelta
import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.gmail import GmailApplicationSuggestion, GmailConnection
from app.models.mock_interview import MockInterviewSession
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeVersion
from app.models.user import User
from app.schemas.application_attention import ApplicationAttentionItem
from app.schemas.launch import TodayResponse, TodayTopAction, TodayWeeklyProgress
from app.services.application_attention import ApplicationAttentionService
from app.services.application_events import ApplicationEventService
from app.services.notifications import NotificationService
from app.services.settings import SettingsService


logger = logging.getLogger(__name__)


class TodayService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def summary(self, user: User) -> TodayResponse:
        now = datetime.now(UTC)
        week_start = now - timedelta(days=7)
        applications = self._active_rows(Application, user.id)
        resumes = self._active_rows(ResumeVersion, user.id)
        coding = self._active_rows(CodingProblem, user.id)
        behavioral = self._active_rows(BehavioralQuestion, user.id)
        system_design = self._active_rows(SystemDesignPrompt, user.id)
        attention = ApplicationAttentionService(self.db, now).build(
            user.id, applications=applications
        )
        sections = {
            "core_workspace": "ready",
            "smart_inbox": "ready",
            "gmail": "not_connected",
            "notifications": "ready",
            "analytics": "ready",
            "ai_coach": "disabled",
        }
        gmail = self._gmail_summary(user.id, sections)
        notifications = {"unread_count": 0}
        try:
            notification_service = NotificationService(self.db)
            notification_service.reconcile_attention(user.id, attention[:10])
            notifications["unread_count"] = notification_service.list(user.id).unread_count
        except SQLAlchemyError:
            self.db.rollback()
            sections["notifications"] = "unavailable"
            logger.warning("today.notifications_unavailable user_id=%s", user.id)
        settings = SettingsService(self.db).get_or_create(user)
        interviews = list(
            self.db.scalars(
                select(MockInterviewSession).where(
                    MockInterviewSession.user_id == user.id,
                    MockInterviewSession.status == "completed",
                    MockInterviewSession.completed_at >= week_start,
                )
            )
        )
        follow_ups = list(
            self.db.scalars(
                select(ApplicationEvent).where(
                    ApplicationEvent.user_id == user.id,
                    ApplicationEvent.deleted_at.is_(None),
                    ApplicationEvent.event_type == "follow_up",
                    ApplicationEvent.status == "completed",
                    ApplicationEvent.completed_at >= week_start,
                )
            )
        )
        top_action = self._top_action(attention, applications, resumes)
        return TodayResponse(
            generated_at=now,
            workspace_status=(
                "partial"
                if any(value == "unavailable" for value in sections.values())
                else "ready"
            ),
            date=now.date(),
            top_action=top_action,
            attention_items=attention[:5],
            upcoming_events=ApplicationEventService(self.db).upcoming(user.id, days=14)[:8],
            weekly_progress=TodayWeeklyProgress(
                applications_added=sum(
                    1 for row in applications if _utc(row.created_at) >= week_start
                ),
                coding_problems=sum(
                    1 for row in coding if _completed_this_week(row, week_start)
                ),
                mock_interviews=len(interviews),
                follow_ups_completed=len(follow_ups),
                prep_tasks=sum(
                    1
                    for row in [*coding, *behavioral, *system_design]
                    if _completed_this_week(row, week_start)
                ),
                goals={
                    "applications": settings.weekly_application_goal,
                    "coding": settings.weekly_coding_goal,
                    "mock_interviews": settings.weekly_mock_interview_goal,
                    "follow_ups": settings.weekly_follow_up_goal,
                },
            ),
            pipeline=self._pipeline(applications),
            recent_activity=self._activity(
                applications, resumes, interviews, coding, behavioral, system_design
            ),
            resume_performance=self._resume_performance(resumes),
            gmail=gmail,
            notifications=notifications,
            sections=sections,
        )

    def _gmail_summary(
        self, user_id: UUID, sections: dict[str, str]
    ) -> dict[str, object]:
        try:
            connection = self.db.scalar(
                select(GmailConnection).where(GmailConnection.user_id == user_id)
            )
            if connection is None or connection.status == "disconnected":
                return {"status": "not_connected", "pending_suggestions": 0}
            pending = int(
                self.db.scalar(
                    select(func.count(GmailApplicationSuggestion.id)).where(
                        GmailApplicationSuggestion.user_id == user_id,
                        GmailApplicationSuggestion.status == "pending",
                    )
                )
                or 0
            )
            sections["gmail"] = (
                "needs_reauthorization"
                if connection.status == "needs_reauthorization"
                else "ready"
            )
            return {
                "status": connection.status,
                "pending_suggestions": pending,
            }
        except SQLAlchemyError:
            self.db.rollback()
            sections["gmail"] = "unavailable"
            logger.warning("today.gmail_unavailable user_id=%s", user_id)
            return {"status": "unavailable", "pending_suggestions": 0}

    def _active_rows(self, model: type, user_id: UUID) -> list:
        statement = select(model).where(model.user_id == user_id)
        if hasattr(model, "deleted_at"):
            statement = statement.where(model.deleted_at.is_(None))
        return list(self.db.scalars(statement.order_by(model.updated_at.desc())))

    def _top_action(
        self,
        attention: list[ApplicationAttentionItem],
        applications: list[Application],
        resumes: list[ResumeVersion],
    ) -> TodayTopAction | None:
        if attention:
            item = attention[0]
            return TodayTopAction(
                type=item.category,
                title=item.title,
                description=f"{item.company} - {item.role}. {item.description}",
                application_id=item.application_id,
                priority=item.priority,
                action_label="Review emails" if item.category == "gmail_review" else item.suggested_action,
                action_url="/integrations/gmail" if item.category == "gmail_review" else f"/applications?application={item.application_id}",
            )
        if not resumes:
            return TodayTopAction(
                type="upload_resume",
                title="Upload your first resume",
                description="Create a resume version to unlock role-specific analysis and prep.",
                priority=30,
                action_label="Add resume",
                action_url="/resumes?action=add",
            )
        if not applications:
            return TodayTopAction(
                type="add_application",
                title="Add your first application",
                description="Track a target role so OfferOS can organize deadlines and next actions.",
                priority=25,
                action_label="Add application",
                action_url="/applications?action=add",
            )
        return TodayTopAction(
            type="mock_interview",
            title="Practice for an active role",
            description="Use a saved resume and application context for a focused mock interview.",
            priority=20,
            action_label="Start mock interview",
            action_url="/prep?tab=mock-interviews",
        )

    def _pipeline(self, applications: list[Application]) -> dict[str, int]:
        result = {"saved": 0, "applied": 0, "oa": 0, "interview": 0, "offer": 0}
        for application in applications:
            status = application.status.value
            if status in {"wishlist", "applying"}:
                result["saved"] += 1
            elif status == "applied":
                result["applied"] += 1
            elif status == "oa":
                result["oa"] += 1
            elif status in {"interview", "final_round"}:
                result["interview"] += 1
            elif status == "offer":
                result["offer"] += 1
        return result

    def _activity(self, *groups: list) -> list[dict[str, str]]:
        rows: list[tuple[datetime, dict[str, str]]] = []
        for group in groups:
            for item in group:
                timestamp = getattr(item, "completed_at", None) or getattr(item, "updated_at", None)
                if timestamp is None:
                    continue
                if isinstance(item, Application):
                    activity_type, label = "application", f"{item.company} - {item.role}"
                elif isinstance(item, ResumeVersion):
                    activity_type, label = "resume", item.name
                elif isinstance(item, MockInterviewSession):
                    activity_type, label = "mock_interview", item.title
                else:
                    activity_type = "prep"
                    label = getattr(item, "title", None) or getattr(item, "question", "Prep activity")
                rows.append(
                    (
                        _utc(timestamp),
                        {
                            "type": activity_type,
                            "label": str(label),
                            "timestamp": _utc(timestamp).isoformat(),
                        },
                    )
                )
        return [value for _, value in sorted(rows, key=lambda row: row[0], reverse=True)[:8]]

    def _resume_performance(self, resumes: list[ResumeVersion]) -> dict[str, object]:
        analyzed = [
            resume
            for resume in resumes
            if resume.latest_analysis_id is not None
            or resume.analysis_status == "completed"
        ]
        best = max(
            analyzed,
            key=lambda resume: resume.latest_overall_score or 0,
            default=None,
        )
        return {
            "analyzed": len(analyzed),
            "total": len(resumes),
            "best_resume": best.name if best else None,
            "best_score": best.latest_overall_score if best else None,
        }


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _completed_this_week(item: object, threshold: datetime) -> bool:
    status = getattr(getattr(item, "status", None), "value", getattr(item, "status", None))
    updated_at = getattr(item, "updated_at", None)
    return status == "completed" and updated_at is not None and _utc(updated_at) >= threshold
