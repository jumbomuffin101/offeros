from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.career_intelligence import cache as career_cache
from app.career_intelligence.cache import clear_cache
from app.career_intelligence.schemas import CareerContextPublic
from app.career_intelligence.service import CareerIntelligenceService
from app.career_intelligence.trends import count_trend, status_ratio_trend
from app.models.application import Application
from app.models.base import ApplicationStatus, Base, Priority, ResumeStatus
from app.models.career_intelligence import CareerObservation
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.user import User
from app.services.account import AccountService
from app.services.today import TodayService


NOW = datetime(2026, 7, 30, 12, tzinfo=UTC)


def test_read_only_career_intelligence_routes(client: TestClient) -> None:
    for path in (
        "/api/v1/career-intelligence/context",
        "/api/v1/career-intelligence/health",
        "/api/v1/career-intelligence/observations",
        "/api/v1/career-intelligence/recommendations",
        "/api/v1/career-intelligence/trends",
    ):
        response = client.get(path)
        assert response.status_code == 200
        assert "data" in response.json()


def test_new_user_has_honest_insufficient_data_context() -> None:
    with database() as db:
        user = add_user(db, "new")
        context = CareerIntelligenceService(db).context(user.id, refresh=True)
        assert context.applications["total"] == 0
        assert context.gmail["status"] == "not_connected"
        assert context.career_health.status == "insufficient_data"
        assert context.career_health.overall_score is None
        assert context.recommendations == []


def test_context_is_user_scoped_deterministic_and_bounded() -> None:
    with database() as db:
        owner = add_user(db, "owner")
        other = add_user(db, "other")
        for index in range(30):
            add_application(db, owner.id, f"Owner {index}", created_at=NOW - timedelta(days=index))
        add_application(db, other.id, "Private")
        db.commit()
        query_count = 0

        def count_query(*_: object) -> None:
            nonlocal query_count
            query_count += 1

        event.listen(db.bind, "before_cursor_execute", count_query)
        try:
            first = CareerIntelligenceService(db).context(owner.id, refresh=True)
        finally:
            event.remove(db.bind, "before_cursor_execute", count_query)
        second = CareerIntelligenceService(db).context(owner.id, refresh=True)
        assert first.applications["total"] == 30
        assert all(item["company"].startswith("Owner") for item in first.applications["recent"])
        assert [item.key for item in first.recommendations] == [item.key for item in second.recommendations]
        assert query_count <= 18


def test_public_context_omits_raw_sensitive_content() -> None:
    with database() as db:
        user = add_user(db, "privacy")
        application = add_application(db, user.id, "Private Co")
        application.job_description = "SENSITIVE_JOB_DESCRIPTION_SENTINEL"
        application.notes = "SENSITIVE_APPLICATION_NOTES_SENTINEL"
        db.add(ResumeVersion(
            user_id=user.id,
            name="Private resume",
            target_role="SWE",
            status=ResumeStatus.ACTIVE,
            extracted_text="SENSITIVE_RESUME_TEXT_SENTINEL",
        ))
        db.commit()
        context = CareerIntelligenceService(db).context(user.id, refresh=True)
        public = CareerContextPublic(
            **context.model_dump(exclude={"user_id", "recent_activity"})
        ).model_dump_json()
        assert "SENSITIVE_JOB_DESCRIPTION_SENTINEL" not in public
        assert "SENSITIVE_APPLICATION_NOTES_SENTINEL" not in public
        assert "SENSITIVE_RESUME_TEXT_SENTINEL" not in public
        assert str(user.id) not in public


def test_observations_deduplicate_update_and_resolve() -> None:
    with database() as db:
        user = add_user(db, "observations")
        for index in range(3):
            add_application(db, user.id, f"Stale {index}", created_at=NOW - timedelta(days=20))
        db.commit()
        service = CareerIntelligenceService(db)
        first = service.context(user.id, refresh=True)
        second = service.context(user.id, refresh=True)
        assert any(item.observation_type == "application_cadence" for item in first.observations)
        assert len(second.observations) == len(first.observations)
        assert db.scalar(select(func.count(CareerObservation.id)).where(CareerObservation.user_id == user.id)) == len(first.observations)
        add_application(db, user.id, "Fresh", created_at=NOW)
        db.commit()
        service.context(user.id, refresh=True)
        cadence = db.scalar(select(CareerObservation).where(
            CareerObservation.user_id == user.id,
            CareerObservation.observation_type == "application_cadence",
        ))
        assert cadence is not None and cadence.status == "resolved"


def test_dismissed_observation_is_not_reactivated() -> None:
    with database() as db:
        user = add_user(db, "dismissed")
        for index in range(3):
            add_application(db, user.id, f"Stale {index}", created_at=NOW - timedelta(days=20))
        db.commit()
        service = CareerIntelligenceService(db)
        service.context(user.id, refresh=True)
        cadence = db.scalar(select(CareerObservation).where(
            CareerObservation.user_id == user.id,
            CareerObservation.observation_type == "application_cadence",
        ))
        assert cadence is not None
        cadence.status = "dismissed"
        db.commit()
        refreshed = service.context(user.id, refresh=True)
        assert all(item.observation_type != "application_cadence" for item in refreshed.observations)
        assert cadence.status == "dismissed"


def test_recommendations_cover_deadline_prep_and_stale_application() -> None:
    with database() as db:
        user = add_user(db, "recommendations")
        application = add_application(
            db, user.id, "Interview Co", status=ApplicationStatus.INTERVIEW,
            created_at=NOW - timedelta(days=20), deadline=date(2026, 8, 1),
        )
        application.meaningful_updated_at = NOW - timedelta(days=12)
        db.commit()
        context = CareerIntelligenceService(db).context(user.id, refresh=True)
        types = {item.type for item in context.recommendations}
        assert {"prepare_interview", "generate_prep_plan", "follow_up"} <= types
        assert len({item.key for item in context.recommendations}) == len(context.recommendations)
        assert all(item.action_route.startswith("/") for item in context.recommendations)


def test_health_does_not_penalize_missing_gmail_and_cache_invalidates() -> None:
    with database() as db:
        user = add_user(db, "health")
        add_application(db, user.id, "Active", status=ApplicationStatus.INTERVIEW, created_at=NOW)
        db.add(ResumeVersion(
            user_id=user.id, name="SWE", target_role="SWE", status=ResumeStatus.ACTIVE,
            latest_analysis_id=uuid4(), latest_overall_score=82, analysis_status="completed",
        ))
        db.commit()
        service = CareerIntelligenceService(db)
        before = service.context(user.id)
        assert before.gmail["status"] == "not_connected"
        assert "GMAIL" not in " ".join(before.career_health.reason_codes)
        add_application(db, user.id, "Second", created_at=NOW)
        db.commit()
        after = service.context(user.id)
        assert after.applications["total"] == before.applications["total"] + 1


def test_cache_hit_expiry_failure_fallback_and_user_isolation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with database() as db:
        owner = add_user(db, "cache-owner")
        other = add_user(db, "cache-other")
        add_application(db, owner.id, "Cached")
        db.commit()
        service = CareerIntelligenceService(db)
        cached = service.context(owner.id, refresh=True)

        def build_failed(*_: object, **__: object):
            raise RuntimeError("fresh build should not run")

        monkeypatch.setattr(
            "app.career_intelligence.service.CareerContextBuilder.build",
            build_failed,
        )
        assert service.context(owner.id) == cached
        with pytest.raises(RuntimeError, match="fresh build"):
            service.context(other.id)

    monkeypatch.undo()
    with database() as db:
        user = add_user(db, "cache-expiry")
        service = CareerIntelligenceService(db)
        monkeypatch.setattr(career_cache, "CACHE_TTL", timedelta(seconds=-1))
        expired = service.context(user.id, refresh=True)
        assert career_cache.get_cached(user.id) is None
        monkeypatch.undo()
        monkeypatch.setattr(
            "app.career_intelligence.service.get_cached",
            lambda _: (_ for _ in ()).throw(RuntimeError("cache unavailable")),
        )
        rebuilt = service.context(user.id)
        assert rebuilt.user_id == expired.user_id


def test_trends_are_sample_aware() -> None:
    rows = [type("Row", (), {"updated_at": NOW - timedelta(days=day)})() for day in (1, 2, 3)]
    assert count_trend(rows, NOW).direction == "insufficient_data"
    rows.extend(type("Row", (), {"updated_at": NOW - timedelta(days=day)})() for day in (4, 5, 20, 21))
    assert count_trend(rows, NOW).direction == "improving"
    cohorts = [
        type("Application", (), {"created_at": NOW - timedelta(days=day), "status": status})()
        for day, status in (
            (1, ApplicationStatus.INTERVIEW),
            (2, ApplicationStatus.OA),
            (15, ApplicationStatus.APPLIED),
            (16, ApplicationStatus.APPLIED),
        )
    ]
    assert status_ratio_trend(
        cohorts,
        NOW,
        {"oa", "interview", "final_round", "offer"},
    ).direction == "improving"


def test_today_survives_career_intelligence_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    with database() as db:
        user = add_user(db, "today-partial")

        def unavailable(*_: object, **__: object):
            raise RuntimeError("optional intelligence unavailable")

        monkeypatch.setattr(CareerIntelligenceService, "context", unavailable)
        summary = TodayService(db).summary(user)
        assert summary.workspace_status == "partial"
        assert summary.sections["career_intelligence"] == "unavailable"
        assert summary.career_health is None


def test_account_export_and_delete_include_observations() -> None:
    with database() as db:
        user = add_user(db, "lifecycle")
        for index in range(3):
            add_application(db, user.id, f"Stale {index}", created_at=NOW - timedelta(days=20))
        db.commit()
        CareerIntelligenceService(db).context(user.id, refresh=True)
        exported = AccountService(db).export(user)
        assert exported["career_observations"]
        assert "hidden" not in str(exported["career_observations"]).lower()
        AccountService(db).delete(user.id)
        assert db.scalar(select(CareerObservation).where(CareerObservation.user_id == user.id)) is None


@contextmanager
def database():
    clear_cache()
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        yield db
    Base.metadata.drop_all(engine)
    engine.dispose()
    clear_cache()


def add_user(db: Session, suffix: str) -> User:
    user = User(clerk_user_id=f"career-{suffix}", email=f"career-{suffix}@example.com", name=suffix)
    db.add(user)
    db.flush()
    return user


def add_application(
    db: Session,
    user_id,
    company: str,
    *,
    status: ApplicationStatus = ApplicationStatus.APPLIED,
    created_at: datetime = NOW - timedelta(days=20),
    deadline: date | None = None,
) -> Application:
    row = Application(
        user_id=user_id, company=company, role="Software Engineer", status=status,
        priority=Priority.HIGH, created_at=created_at, updated_at=created_at,
        meaningful_updated_at=created_at, deadline=deadline,
    )
    db.add(row)
    db.flush()
    return row
