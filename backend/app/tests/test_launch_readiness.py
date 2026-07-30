from contextlib import contextmanager
from datetime import UTC, date, datetime
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.models.application import Application
from app.models.analytics import AnalyticsSnapshot
from app.models.application_attention import ApplicationAttentionOverride
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.base import ApplicationStatus, Base
from app.models.calendar import CalendarConnection
from app.models.coding import CodingActivity, CodingGoal, CodingProfileConnection
from app.models.gmail import (
    GmailApplicationSuggestion,
    GmailConnection,
    GmailMessageReference,
)
from app.models.launch import AIUsageEvent, Notification
from app.models.mock_interview import MockInterviewScorecard, MockInterviewSession, MockInterviewTurn
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.settings import UserSettings
from app.models.user import User
from app.main import app
from app.schemas.launch import NotificationCreate
from app.services.account import AccountService
from app.services.notifications import NotificationService
from app.services.today import TodayService
from app.services.usage import AIUsageService


def test_launch_routes_and_request_id(client: TestClient) -> None:
    health = client.get("/api/v1/health")
    ready = client.get("/api/v1/ready")
    settings = client.get("/api/v1/settings")
    today = client.get("/api/v1/dashboard/today")

    assert health.status_code == 200
    assert health.headers["x-request-id"]
    assert ready.status_code == 200
    assert settings.status_code == 200
    assert settings.json()["data"]["onboarding_status"] == "not_started"
    assert today.status_code == 200
    today_data = today.json()["data"]
    assert today_data["top_action"]["type"] == "upload_resume"
    assert today_data["workspace_status"] == "ready"
    assert today_data["gmail"] == {
        "status": "not_connected",
        "pending_suggestions": 0,
    }
    assert today_data["notifications"]["unread_count"] == 0
    assert today_data["sections"]["ai_coach"] == "disabled"
    assert today_data["generated_at"]
    assert client.get("/api/v1/notifications").status_code == 200
    assert client.get("/api/v1/account/usage").status_code == 200


def test_cors_preflight_allows_authenticated_request_id_header(
    client: TestClient,
) -> None:
    response = client.options(
        "/api/v1/dashboard/today",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,x-request-id",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "x-request-id" in allowed_headers


def test_today_handles_gmail_connection_with_zero_and_pending_suggestions() -> None:
    with database() as db:
        user = add_user(db, "today-gmail")
        connection = GmailConnection(
            user_id=user.id,
            google_account_id="google-today-gmail",
            gmail_address="today-gmail@example.com",
            encrypted_refresh_token="encrypted",
            status="connected",
        )
        db.add(connection)
        db.commit()

        empty_summary = TodayService(db).summary(user)
        assert empty_summary.workspace_status == "ready"
        assert empty_summary.gmail == {
            "status": "connected",
            "pending_suggestions": 0,
        }
        assert empty_summary.sections["gmail"] == "ready"

        now = datetime.now(UTC)
        message = GmailMessageReference(
            user_id=user.id,
            gmail_connection_id=connection.id,
            gmail_message_id="today-message",
            gmail_thread_id="today-thread",
            internal_date=now,
            received_at=now,
        )
        db.add(message)
        db.flush()
        db.add(
            GmailApplicationSuggestion(
                user_id=user.id,
                gmail_connection_id=connection.id,
                gmail_message_reference_id=message.id,
                status="pending",
            )
        )
        db.commit()

        pending_summary = TodayService(db).summary(user)
        assert pending_summary.gmail["pending_suggestions"] == 1


def test_today_optional_gmail_failure_returns_partial_workspace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with database() as db:
        user = add_user(db, "today-partial")

        def unavailable_gmail(
            _service: TodayService, _user_id: object, sections: dict[str, str]
        ) -> dict[str, object]:
            sections["gmail"] = "unavailable"
            return {"status": "unavailable", "pending_suggestions": 0}

        monkeypatch.setattr(TodayService, "_gmail_summary", unavailable_gmail)
        summary = TodayService(db).summary(user)

        assert summary.workspace_status == "partial"
        assert summary.sections["core_workspace"] == "ready"
        assert summary.sections["gmail"] == "unavailable"
        assert summary.gmail["pending_suggestions"] == 0
        assert summary.top_action is not None


def test_today_optional_notification_failure_returns_partial_workspace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with database() as db:
        user = add_user(db, "today-notifications-partial")

        def unavailable_notifications(*_args: object, **_kwargs: object) -> None:
            raise SQLAlchemyError("notifications unavailable")

        monkeypatch.setattr(
            NotificationService,
            "reconcile_attention",
            unavailable_notifications,
        )
        summary = TodayService(db).summary(user)

        assert summary.workspace_status == "partial"
        assert summary.sections["core_workspace"] == "ready"
        assert summary.sections["notifications"] == "unavailable"
        assert summary.notifications == {"unread_count": 0}
        assert summary.top_action is not None


def test_today_is_user_scoped_and_serializes_populated_workspace() -> None:
    with database() as db:
        owner = add_user(db, "today-owner")
        other = add_user(db, "today-other")
        db.add_all(
            [
                Application(
                    user_id=owner.id,
                    company="Owner Co",
                    role="Engineer",
                    status=ApplicationStatus.APPLIED,
                ),
                Application(
                    user_id=other.id,
                    company="Other Co",
                    role="Engineer",
                    status=ApplicationStatus.OFFER,
                ),
                ResumeVersion(
                    user_id=owner.id,
                    name="Owner Resume",
                    target_role="Engineer",
                ),
            ]
        )
        db.commit()

        summary = TodayService(db).summary(owner)
        serialized = summary.model_dump(mode="json")

        assert summary.pipeline["applied"] == 1
        assert summary.pipeline["offer"] == 0
        assert summary.resume_performance["total"] == 1
        assert serialized["generated_at"]
        assert isinstance(serialized["attention_items"], list)
        assert all(item["company"] == "Owner Co" for item in serialized["attention_items"])
        assert serialized["upcoming_events"] == []
        json.dumps(serialized)


def test_today_requires_authentication_when_auth_is_required(
    client: TestClient,
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(
        app_env="test",
        auth_required=True,
        clerk_issuer="https://example.clerk.accounts.dev",
        clerk_jwks_url="https://example.clerk.accounts.dev/.well-known/jwks.json",
        clerk_audience="offeros-api",
    )

    response = client.get("/api/v1/dashboard/today")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_notification_dedupe_read_and_user_isolation() -> None:
    with database() as db:
        owner = add_user(db, "notify-owner")
        other = add_user(db, "notify-other")
        service = NotificationService(db)
        payload = NotificationCreate(
            type="system",
            title="Ready",
            message="Your workspace is ready.",
            dedupe_key="ready:1",
        )
        first = service.create(owner.id, payload)
        second = service.create(owner.id, payload)
        assert first.id == second.id
        assert service.list(owner.id).unread_count == 1
        assert service.list(other.id).items == []
        service.mark_read(owner.id, first.id)
        assert service.list(owner.id).unread_count == 0


def test_usage_limit_counts_success_only_and_returns_structured_error() -> None:
    with database() as db:
        user = add_user(db, "usage")
        settings = Settings(
            app_env="test",
            ai_limit_mock_interviews=1,
            ai_mock_enabled=True,
        )
        service = AIUsageService(db, settings)
        failed = service.begin(
            user.id, "mock_interview", provider="mock", model="test"
        )
        service.finish(failed, success=False)
        with service.track(
            user.id, "mock_interview", provider="mock", model="test"
        ):
            pass
        with pytest.raises(AppError) as raised:
            service.begin(
                user.id, "mock_interview", provider="mock", model="test"
            )
        assert raised.value.code == "usage_limit_reached"
        assert raised.value.status_code == 429
        assert raised.value.details["used"] == 1
        assert db.scalar(
            select(AIUsageEvent).where(AIUsageEvent.status == "failed")
        )


def test_account_export_is_scoped_and_delete_cleans_dependents() -> None:
    with database() as db:
        owner = add_user(db, "account-owner")
        other = add_user(db, "account-other")
        db.add_all(
            [
                Application(
                    user_id=owner.id,
                    company="Owner Co",
                    role="Engineer",
                    status=ApplicationStatus.APPLIED,
                ),
                Application(
                    user_id=other.id,
                    company="Other Co",
                    role="Engineer",
                    status=ApplicationStatus.APPLIED,
                ),
            ]
        )
        db.commit()
        service = AccountService(db)
        exported = service.export(owner)
        assert exported["schema_version"] == 2
        assert exported["generated_at"]
        assert [item["company"] for item in exported["applications"]] == ["Owner Co"]
        service.delete(owner.id)
        assert db.get(User, owner.id) is None
        assert db.scalar(select(Application).where(Application.user_id == owner.id)) is None
        assert db.get(User, other.id) is not None
        assert db.scalar(select(Application).where(Application.user_id == other.id))


def test_account_delete_removes_complete_workspace_and_is_idempotent() -> None:
    with database() as db:
        owner = add_user(db, "complete-owner")
        other = add_user(db, "complete-other")
        now = datetime.now(UTC)
        resume = ResumeVersion(user_id=owner.id, name="Owner Resume", target_role="SWE")
        application = Application(
            user_id=owner.id,
            company="Owner Co",
            role="Engineer",
            status=ApplicationStatus.APPLIED,
        )
        db.add_all([resume, application])
        db.flush()
        analysis = ResumeAnalysis(
            user_id=owner.id,
            resume_version_id=resume.id,
            target_role="SWE",
            status="completed",
        )
        session = MockInterviewSession(
            user_id=owner.id,
            application_id=application.id,
            resume_version_id=resume.id,
            interview_type="behavioral",
            title="Owner interview",
            target_role="SWE",
            started_at=now,
        )
        db.add_all([analysis, session])
        db.flush()
        owner_rows = [
            ApplicationEvent(
                user_id=owner.id,
                application_id=application.id,
                event_type="interview",
                title="Interview",
                scheduled_at=now,
            ),
            ApplicationPrepPlan(user_id=owner.id, application_id=application.id),
            ApplicationAttentionOverride(
                user_id=owner.id,
                application_id=application.id,
                category="follow_up",
                signal_key="owner-signal",
                dismissed_at=now,
            ),
            CodingProblem(user_id=owner.id, title="Two Sum", topic="Arrays"),
            CodingActivity(user_id=owner.id, problem_title="Two Sum", solved_at=now),
            CodingProfileConnection(
                user_id=owner.id,
                provider="leetcode",
                username="owner",
                profile_url="https://leetcode.com/u/owner",
            ),
            CodingGoal(user_id=owner.id),
            BehavioralQuestion(user_id=owner.id, question="Tell me about yourself", category="general"),
            SystemDesignPrompt(user_id=owner.id, title="Design a queue", prompt="Design it"),
            AnalyticsSnapshot(user_id=owner.id, snapshot_date=date.today()),
            CalendarConnection(
                user_id=owner.id,
                access_token_encrypted="secret-access",
                refresh_token_encrypted="secret-refresh",
            ),
            UserSettings(user_id=owner.id, onboarding_status="completed", theme="system"),
            Notification(user_id=owner.id, type="system", title="Ready", message="Ready"),
            AIUsageEvent(
                user_id=owner.id,
                operation="resume_analysis",
                status="success",
                created_at=now,
            ),
            MockInterviewTurn(
                session_id=session.id,
                turn_index=0,
                speaker="user",
                content="Private answer",
                created_at=now,
            ),
            MockInterviewScorecard(
                session_id=session.id,
                communication_score=80,
                technical_accuracy_score=80,
                structure_score=80,
                depth_score=80,
                relevance_score=80,
                summary="Summary",
            ),
        ]
        other_application = Application(
            user_id=other.id,
            company="Other Co",
            role="Engineer",
            status=ApplicationStatus.APPLIED,
        )
        db.add_all([*owner_rows, other_application])
        db.commit()

        exported = AccountService(db).export(owner)
        serialized = str(exported)
        assert exported["format"] == "offeros-account-export-v1"
        assert len(exported["mock_interview_turns"]) == 1
        assert "secret-access" not in serialized
        assert "secret-refresh" not in serialized

        service = AccountService(db)
        service.delete(owner.id)
        service.delete(owner.id)

        assert db.get(User, owner.id) is None
        for model in (
            Application,
            ApplicationEvent,
            ApplicationPrepPlan,
            ResumeVersion,
            ResumeAnalysis,
            CodingProblem,
            CodingActivity,
            CodingProfileConnection,
            CodingGoal,
            BehavioralQuestion,
            SystemDesignPrompt,
            AnalyticsSnapshot,
            CalendarConnection,
            UserSettings,
            Notification,
            AIUsageEvent,
            MockInterviewSession,
        ):
            assert db.scalar(select(model).where(model.user_id == owner.id)) is None
        assert db.get(User, other.id) is not None
        assert db.scalar(select(Application).where(Application.user_id == other.id))


def test_account_delete_requires_confirmation_and_authentication(client: TestClient) -> None:
    assert client.post("/api/v1/account/delete", json={"confirmation": "NO"}).status_code == 422
    app.dependency_overrides[get_settings] = lambda: Settings(
        app_env="test",
        auth_required=True,
        clerk_issuer="https://example.clerk.accounts.dev",
        clerk_jwks_url="https://example.clerk.accounts.dev/.well-known/jwks.json",
        clerk_audience="offeros-api",
    )
    assert client.post("/api/v1/account/delete", json={"confirmation": "DELETE"}).status_code == 401


def test_account_export_handles_empty_and_large_workspaces() -> None:
    with database() as db:
        owner = add_user(db, "export-volume")
        service = AccountService(db)
        empty_export = service.export(owner)
        assert empty_export["applications"] == []
        json.dumps(empty_export)

        db.add_all(
            [
                Application(
                    user_id=owner.id,
                    company=f"Company {index}",
                    role="Engineer",
                    status=ApplicationStatus.APPLIED,
                )
                for index in range(250)
            ]
        )
        db.commit()
        large_export = service.export(owner)
        assert len(large_export["applications"]) == 250
        json.dumps(large_export)


@contextmanager
def database():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db: Session = sessionmaker(
        bind=engine, autoflush=False, expire_on_commit=False
    )()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def add_user(db: Session, suffix: str) -> User:
    user = User(
        clerk_user_id=f"launch-{suffix}",
        email=f"launch-{suffix}@example.com",
        name=suffix,
        created_at=datetime.now(UTC),
    )
    db.add(user)
    db.commit()
    return user
