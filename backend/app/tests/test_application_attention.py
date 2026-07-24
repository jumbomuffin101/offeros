from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.base import ApplicationStatus, Base
from app.models.user import User
from app.schemas.application_attention import ApplicationAttentionOverrideRequest
from app.services.application_attention import ApplicationAttentionService


NOW = datetime(2026, 7, 23, 12, tzinfo=UTC)


def test_applied_follow_up_threshold_and_recent_application() -> None:
    with database() as db:
        user = add_user(db, "follow-up")
        old = add_application(
            db,
            user.id,
            status=ApplicationStatus.APPLIED,
            date_applied=date(2026, 7, 11),
        )
        recent = add_application(
            db,
            user.id,
            company="Recent",
            status=ApplicationStatus.APPLIED,
            date_applied=date(2026, 7, 18),
        )
        items = ApplicationAttentionService(db, NOW).build(user.id)
        assert has(items, old.id, "follow_up_due")
        assert not has(items, recent.id, "follow_up_due")


def test_event_deadline_priorities_and_rejected_filtering() -> None:
    with database() as db:
        user = add_user(db, "events")
        application = add_application(
            db, user.id, status=ApplicationStatus.INTERVIEW
        )
        rejected = add_application(
            db,
            user.id,
            company="Rejected",
            status=ApplicationStatus.REJECTED,
        )
        add_event(db, user.id, application.id, "oa_deadline", 12)
        add_event(db, user.id, application.id, "technical_interview", 48)
        add_event(db, user.id, application.id, "offer_deadline", 20)
        add_event(db, user.id, rejected.id, "technical_interview", 12)
        items = ApplicationAttentionService(db, NOW).build(user.id)
        assert priority(items, application.id, "oa_deadline_soon") == 90
        assert priority(items, application.id, "interview_soon") == 80
        assert priority(items, application.id, "offer_deadline_soon") == 95
        assert not any(item.application_id == rejected.id for item in items)


def test_missing_context_analysis_prep_and_low_readiness_rules() -> None:
    with database() as db:
        user = add_user(db, "context")
        missing = add_application(
            db, user.id, status=ApplicationStatus.APPLYING
        )
        ready_for_analysis = add_application(
            db,
            user.id,
            company="Analysis",
            status=ApplicationStatus.APPLIED,
            resume_version_id=uuid4(),
            job_description="Build backend systems.",
        )
        interview = add_application(
            db,
            user.id,
            company="Interview",
            status=ApplicationStatus.INTERVIEW,
            resume_version_id=uuid4(),
            resume_analysis_id=uuid4(),
            job_description="Build APIs.",
        )
        plan = ApplicationPrepPlan(
            user_id=user.id,
            application_id=interview.id,
            coding={"priority_topics": [{"topic": "Graphs"}]},
            behavioral={"focus_areas": [{"category": "Ownership"}]},
            system_design={"focus_areas": [{"topic": "Caching"}]},
        )
        db.add(plan)
        add_event(db, user.id, interview.id, "technical_interview", 48)
        db.commit()
        items = ApplicationAttentionService(db, NOW).build(user.id)
        assert has(items, missing.id, "missing_resume")
        assert has(items, missing.id, "missing_job_description")
        assert has(items, ready_for_analysis.id, "needs_resume_analysis")
        assert not has(items, interview.id, "needs_prep_plan")
        assert priority(items, interview.id, "low_prep_readiness") == 70


def test_completed_interview_stale_snooze_dismiss_focus_and_user_isolation() -> None:
    with database() as db:
        owner = add_user(db, "owner")
        other = add_user(db, "other")
        application = add_application(
            db,
            owner.id,
            status=ApplicationStatus.INTERVIEW,
            meaningful_updated_at=NOW - timedelta(days=25),
        )
        event_row = add_event(
            db,
            owner.id,
            application.id,
            "technical_interview",
            -96,
            status="completed",
        )
        event_row.completed_at = NOW - timedelta(days=4)
        db.commit()
        service = ApplicationAttentionService(db, NOW)
        items = service.build(owner.id)
        assert has(items, application.id, "follow_up_due")
        assert has(items, application.id, "stale_application")
        assert service.focus(owner.id).type == "follow_up_due"
        assert service.build(other.id) == []

        service.override(
            owner.id,
            ApplicationAttentionOverrideRequest(
                application_id=application.id,
                category="follow_up_due",
                action="snooze",
                duration="tomorrow",
            ),
        )
        assert not has(service.build(owner.id), application.id, "follow_up_due")
        service.override(
            owner.id,
            ApplicationAttentionOverrideRequest(
                application_id=application.id,
                category="stale_application",
                action="dismiss",
            ),
        )
        assert not has(service.build(owner.id), application.id, "stale_application")


def test_attention_query_count_is_bounded() -> None:
    with database() as db:
        user = add_user(db, "queries")
        for index in range(20):
            add_application(
                db,
                user.id,
                company=f"Company {index}",
                status=ApplicationStatus.APPLIED,
                date_applied=date(2026, 7, 1),
            )
        db.commit()
        count = 0

        def before_cursor_execute(*_: object) -> None:
            nonlocal count
            count += 1

        event.listen(db.bind, "before_cursor_execute", before_cursor_execute)
        try:
            ApplicationAttentionService(db, NOW).build(user.id)
        finally:
            event.remove(db.bind, "before_cursor_execute", before_cursor_execute)
        assert count <= 5


class database:
    def __enter__(self) -> Session:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(
            bind=self.engine, autoflush=False, expire_on_commit=False
        )()
        return self.session

    def __exit__(self, *_: object) -> None:
        self.session.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()


def add_user(db: Session, suffix: str) -> User:
    user = User(
        clerk_user_id=f"attention-{suffix}",
        email=f"attention-{suffix}@example.com",
        name=suffix,
    )
    db.add(user)
    db.flush()
    return user


def add_application(
    db: Session,
    user_id,
    *,
    company: str = "Acme",
    status: ApplicationStatus,
    date_applied: date | None = None,
    meaningful_updated_at: datetime | None = None,
    resume_version_id=None,
    resume_analysis_id=None,
    job_description: str = "",
) -> Application:
    application = Application(
        user_id=user_id,
        company=company,
        role="Software Engineer",
        status=status,
        date_applied=date_applied,
        meaningful_updated_at=meaningful_updated_at or NOW,
        resume_version_id=resume_version_id,
        resume_analysis_id=resume_analysis_id,
        job_description=job_description,
        created_at=meaningful_updated_at or NOW,
    )
    db.add(application)
    db.flush()
    return application


def add_event(
    db: Session,
    user_id,
    application_id,
    event_type: str,
    hours: int,
    *,
    status: str = "upcoming",
) -> ApplicationEvent:
    event_row = ApplicationEvent(
        user_id=user_id,
        application_id=application_id,
        event_type=event_type,
        title=event_type.replace("_", " ").title(),
        scheduled_at=NOW + timedelta(hours=hours),
        status=status,
    )
    db.add(event_row)
    db.flush()
    return event_row


def has(items, application_id, category: str) -> bool:
    return any(
        item.application_id == application_id and item.category == category
        for item in items
    )


def priority(items, application_id, category: str) -> int:
    return next(
        item.priority
        for item in items
        if item.application_id == application_id and item.category == category
    )
