from contextlib import contextmanager
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings
from app.core.errors import AppError
from app.models.application import Application
from app.models.base import ApplicationStatus, Base
from app.models.launch import AIUsageEvent
from app.models.user import User
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
        assert [item["company"] for item in exported["applications"]] == ["Owner Co"]
        service.delete(owner.id)
        assert db.get(User, owner.id) is None
        assert db.scalar(select(Application).where(Application.user_id == owner.id)) is None
        assert db.get(User, other.id) is not None
        assert db.scalar(select(Application).where(Application.user_id == other.id))


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
