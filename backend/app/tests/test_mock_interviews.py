from contextlib import contextmanager
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.models.application import Application
from app.models.base import ApplicationStatus, Base, ResumeStatus
from app.models.mock_interview import MockInterviewSession
from app.models.resume import ResumeVersion
from app.models.user import User
from app.schemas.mock_interview import (
    GeneratedQuestion,
    MockInterviewAnswerRequest,
    MockInterviewCreate,
    MockInterviewScorecardDraft,
    TurnEvaluation,
)
from app.services.mock_interview_ai import _parse
from app.services.mock_interviews import MockInterviewService


def test_mock_interview_routes_are_registered() -> None:
    from app.main import app

    routes = {
        getattr(route, "path", ""): {
            method.lower() for method in getattr(route, "methods", set())
        }
        for route in app.routes
        if getattr(route, "path", None)
    }

    assert "get" in routes["/api/v1/mock-interviews"]
    assert "post" in routes["/api/v1/mock-interviews"]
    assert "get" in routes["/api/v1/mock-interviews/{session_id}"]
    assert "post" in routes["/api/v1/mock-interviews/{session_id}/answer"]
    assert "post" in routes["/api/v1/mock-interviews/{session_id}/abandon"]


def test_create_submit_follow_up_progress_and_complete() -> None:
    with database() as db:
        user = add_user(db, "flow")
        provider = StubProvider(follow_up_answers={1, 2, 3})
        service = MockInterviewService(db, Settings(app_env="test"), provider)
        created = service.create(
            user.id,
            MockInterviewCreate(
                interview_type="mixed",
                difficulty="standard",
                question_count=3,
            ),
        )
        assert created.session.status == "active"
        assert created.first_turn.speaker == "interviewer"

        for index in range(5):
            result = service.answer(
                user.id,
                created.session.id,
                MockInterviewAnswerRequest(
                    answer=f"Answer {index} with concrete context and tradeoffs.",
                    answer_request_id=uuid4(),
                ),
            )
        assert result.session.status == "completed"
        assert result.session.scorecard is not None
        assert result.session.overall_score == 76
        assert provider.follow_up_questions == 2


def test_session_resume_duplicate_answer_and_abandon() -> None:
    with database() as db:
        user = add_user(db, "resume")
        service = MockInterviewService(
            db, Settings(app_env="test"), StubProvider()
        )
        created = service.create(
            user.id,
            MockInterviewCreate(
                interview_type="technical",
                difficulty="challenging",
                question_count=3,
            ),
        )
        request_id = uuid4()
        first = service.answer(
            user.id,
            created.session.id,
            MockInterviewAnswerRequest(
                answer="I would start with traces, compare latency percentiles, and isolate dependencies.",
                answer_request_id=request_id,
            ),
        )
        turn_count = len(first.session.turns)
        duplicate = service.answer(
            user.id,
            created.session.id,
            MockInterviewAnswerRequest(
                answer="This duplicate body should not create a second turn.",
                answer_request_id=request_id,
            ),
        )
        assert len(duplicate.session.turns) == turn_count
        assert service.get(user.id, created.session.id).turns
        abandoned = service.abandon(user.id, created.session.id)
        assert abandoned.status == "abandoned"


def test_application_resume_ownership_and_user_isolation() -> None:
    with database() as db:
        owner = add_user(db, "owner")
        other = add_user(db, "other")
        application = Application(
            user_id=owner.id,
            company="Acme",
            role="Software Engineer",
            status=ApplicationStatus.INTERVIEW,
        )
        resume = ResumeVersion(
            user_id=owner.id,
            name="SWE Resume",
            target_role="Software Engineer",
            status=ResumeStatus.ACTIVE,
        )
        db.add_all([application, resume])
        db.commit()
        service = MockInterviewService(
            db, Settings(app_env="test"), StubProvider()
        )
        with pytest.raises(NotFoundError):
            service.create(
                other.id,
                MockInterviewCreate(
                    application_id=application.id,
                    interview_type="behavioral",
                    difficulty="standard",
                    question_count=3,
                ),
            )
        with pytest.raises(NotFoundError):
            service.create(
                other.id,
                MockInterviewCreate(
                    resume_version_id=resume.id,
                    interview_type="resume",
                    difficulty="standard",
                    question_count=3,
                ),
            )
        created = service.create(
            owner.id,
            MockInterviewCreate(
                application_id=application.id,
                resume_version_id=resume.id,
                interview_type="mixed",
                difficulty="standard",
                question_count=3,
            ),
        )
        with pytest.raises(NotFoundError):
            service.get(other.id, created.session.id)


def test_malformed_provider_json_is_rejected() -> None:
    with pytest.raises(AppError):
        _parse("not-json", TurnEvaluation)


def test_persisted_session_can_be_loaded_by_new_service() -> None:
    with database() as db:
        user = add_user(db, "persisted")
        created = MockInterviewService(
            db, Settings(app_env="test"), StubProvider()
        ).create(
            user.id,
            MockInterviewCreate(
                interview_type="system_design",
                difficulty="standard",
                question_count=3,
            ),
        )
        db.expire_all()
        resumed = MockInterviewService(
            db, Settings(app_env="test"), StubProvider()
        ).get(user.id, created.session.id)
        assert resumed.status == "active"
        assert len(resumed.turns) == 1
        assert db.scalar(
            select(MockInterviewSession).where(
                MockInterviewSession.id == created.session.id
            )
        )


class StubProvider:
    provider = "mock"
    model = "test"

    def __init__(self, follow_up_answers: set[int] | None = None) -> None:
        self.follow_up_answers = follow_up_answers or set()
        self.evaluations = 0
        self.follow_up_questions = 0

    def question(self, context, interview_type, difficulty, index, history):
        return GeneratedQuestion(
            question=f"Main question {index + 1}?",
            question_type=(
                "technical" if interview_type == "mixed" else interview_type
            ),
        )

    def evaluate(
        self,
        context,
        question,
        answer,
        question_type,
        follow_up_count,
    ):
        self.evaluations += 1
        follow_up = self.evaluations in self.follow_up_answers
        if follow_up and follow_up_count < 2:
            self.follow_up_questions += 1
        return TurnEvaluation(
            scores={
                "accuracy": 4,
                "relevance": 4,
                "clarity": 4,
                "depth": 3,
                "structure": 4,
            },
            strengths=["Clear"],
            weaknesses=["Add depth"],
            missed_points=["Tradeoffs"],
            follow_up_needed=follow_up,
            follow_up_reason="Probe depth" if follow_up else None,
            follow_up_question=(
                f"What tradeoff did you make in answer {self.evaluations}?"
                if follow_up
                else None
            ),
            summary="Good structure.",
        )

    def scorecard(self, interview_type, evaluations, answers):
        return MockInterviewScorecardDraft(
            communication_score=80,
            technical_accuracy_score=80,
            structure_score=80,
            depth_score=60,
            relevance_score=80,
            technical_reasoning_score=76,
            strengths=["Clear"],
            weaknesses=["Add depth"],
            missed_points=["Tradeoffs"],
            strongest_answer=answers[0],
            weakest_answer=answers[-1],
            recommended_actions=["Practice technical tradeoffs."],
            summary="AI-generated practice assessment.",
        )


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
        clerk_user_id=f"mock-interview-{suffix}",
        email=f"mock-interview-{suffix}@example.com",
        name=suffix,
        created_at=datetime.now(UTC),
    )
    db.add(user)
    db.commit()
    return user
