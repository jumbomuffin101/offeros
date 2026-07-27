from datetime import UTC, datetime
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.analytics import AnalyticsSnapshot
from app.models.application_attention import ApplicationAttentionOverride
from app.models.application_copilot import ApplicationCopilotConversation, ApplicationCopilotMessage
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.calendar import CalendarConnection
from app.models.gmail import GmailApplicationSuggestion, GmailConnection, GmailMessageReference
from app.models.coding import CodingActivity, CodingGoal, CodingProfileConnection
from app.models.launch import AIUsageEvent, Notification
from app.models.mock_interview import MockInterviewScorecard, MockInterviewSession, MockInterviewTurn
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.settings import UserSettings
from app.models.user import User


EXPORT_MODELS = {
    "applications": Application,
    "application_events": ApplicationEvent,
    "application_prep_plans": ApplicationPrepPlan,
    "resumes": ResumeVersion,
    "resume_analyses": ResumeAnalysis,
    "coding_problems": CodingProblem,
    "coding_activity": CodingActivity,
    "coding_profile_connections": CodingProfileConnection,
    "coding_goals": CodingGoal,
    "behavioral_questions": BehavioralQuestion,
    "system_design_prompts": SystemDesignPrompt,
    "mock_interviews": MockInterviewSession,
    "notifications": Notification,
    "settings": UserSettings,
    "ai_usage": AIUsageEvent,
}


class AccountService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def export(self, user: User) -> dict[str, object]:
        payload: dict[str, object] = {
            "format": "offeros-account-export-v1",
            "schema_version": 2,
            "generated_at": datetime.now(UTC),
            "account": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "created_at": user.created_at,
            },
        }
        for name, model in EXPORT_MODELS.items():
            rows = list(self.db.scalars(select(model).where(model.user_id == user.id)))
            payload[name] = [_columns(row) for row in rows]
        session_ids = list(
            self.db.scalars(
                select(MockInterviewSession.id).where(
                    MockInterviewSession.user_id == user.id
                )
            )
        )
        payload["mock_interview_turns"] = (
            [
                _columns(row)
                for row in self.db.scalars(
                    select(MockInterviewTurn).where(
                        MockInterviewTurn.session_id.in_(session_ids)
                    )
                )
            ]
            if session_ids
            else []
        )
        payload["mock_interview_scorecards"] = (
            [
                _columns(row)
                for row in self.db.scalars(
                    select(MockInterviewScorecard).where(
                        MockInterviewScorecard.session_id.in_(session_ids)
                    )
                )
            ]
            if session_ids
            else []
        )
        connection = self.db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
        payload["gmail_connection"] = (
            {
                "id": str(connection.id),
                "gmail_address": connection.gmail_address,
                "token_scopes": connection.token_scopes,
                "status": connection.status,
                "last_synced_at": connection.last_synced_at,
                "initial_sync_completed_at": connection.initial_sync_completed_at,
                "created_at": connection.created_at,
            }
            if connection else None
        )
        payload["gmail_suggestions"] = [
            _columns(row)
            for row in self.db.scalars(
                select(GmailApplicationSuggestion).where(GmailApplicationSuggestion.user_id == user.id)
            )
        ]
        payload["gmail_message_metadata"] = [
            {
                "id": str(row.id),
                "gmail_message_id": row.gmail_message_id,
                "gmail_thread_id": row.gmail_thread_id,
                "sender_email": row.sender_email,
                "sender_name": row.sender_name,
                "subject": row.subject,
                "received_at": row.received_at,
                "classification_status": row.classification_status,
                "processing_status": row.processing_status,
            }
            for row in self.db.scalars(
                select(GmailMessageReference).where(GmailMessageReference.user_id == user.id)
            )
        ]
        return jsonable_encoder(payload)

    def delete(self, user_id: UUID) -> None:
        user = self.db.scalar(select(User).where(User.id == user_id))
        if user is None:
            return
        sessions = list(
            self.db.scalars(
                select(MockInterviewSession.id).where(
                    MockInterviewSession.user_id == user_id
                )
            )
        )
        conversations = list(
            self.db.scalars(
                select(ApplicationCopilotConversation.id).where(
                    ApplicationCopilotConversation.user_id == user_id
                )
            )
        )
        if sessions:
            self.db.execute(delete(MockInterviewScorecard).where(MockInterviewScorecard.session_id.in_(sessions)))
            self.db.execute(delete(MockInterviewTurn).where(MockInterviewTurn.session_id.in_(sessions)))
        if conversations:
            self.db.execute(delete(ApplicationCopilotMessage).where(ApplicationCopilotMessage.conversation_id.in_(conversations)))
        for model in (
            GmailApplicationSuggestion,
            GmailMessageReference,
            Notification,
            AIUsageEvent,
            ApplicationAttentionOverride,
            ApplicationEvent,
            ApplicationPrepPlan,
            ApplicationCopilotConversation,
            ResumeAnalysis,
            MockInterviewSession,
            CodingActivity,
            CodingProfileConnection,
            CodingGoal,
            CodingProblem,
            BehavioralQuestion,
            SystemDesignPrompt,
            AnalyticsSnapshot,
            CalendarConnection,
            GmailConnection,
            Application,
            ResumeVersion,
            UserSettings,
        ):
            self.db.execute(delete(model).where(model.user_id == user_id))
        self.db.execute(delete(User).where(User.id == user_id))
        self.db.commit()


def _columns(row: object) -> dict[str, object]:
    table = getattr(row, "__table__")
    return {column.name: getattr(row, column.name) for column in table.columns}
