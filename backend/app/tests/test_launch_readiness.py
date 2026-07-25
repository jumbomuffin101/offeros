from contextlib import contextmanager
from datetime import UTC, date, datetime
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
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
    assert today.json()["data"]["top_action"]["type"] == "upload_resume"
    assert client.get("/api/v1/notifications").status_code == 200
    assert client.get("/api/v1/account/usage").status_code == 200


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
        assert exported["schema_version"] == 1
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
