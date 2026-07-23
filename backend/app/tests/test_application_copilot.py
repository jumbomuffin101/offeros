from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import Settings
from app.core.errors import NotFoundError
from app.models.application import Application
from app.models.application_prep import ApplicationPrepPlan
from app.models.base import Base
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.user import User
from app.schemas.application_copilot import ApplicationCopilotRequest
from app.services.application_copilot import ApplicationCopilotService


def test_copilot_conversation_persists_and_follow_up_draft_works(
    client: TestClient,
) -> None:
    application = client.post(
        "/api/v1/applications",
        json={
            "company": "Acme",
            "role": "Backend Engineer",
            "job_description": "Build reliable Python APIs and PostgreSQL services.",
        },
    ).json()["data"]

    sent = client.post(
        f"/api/v1/applications/{application['id']}/copilot",
        json={"message": "Draft a recruiter follow-up.", "conversation_id": None},
    )
    assert sent.status_code == 200
    result = sent.json()
    assert result["conversation_id"]
    assert result["message"]["role"] == "assistant"
    assert "Subject:" in result["message"]["content"]

    history = client.get(
        f"/api/v1/applications/{application['id']}/copilot"
    ).json()["data"]
    assert history["conversation_id"] == result["conversation_id"]
    assert [message["role"] for message in history["messages"]] == [
        "user",
        "assistant",
    ]
    assert "Application details" in history["context_sources"]
    assert "Job description" in history["context_sources"]


class CaptureProvider:
    provider = "capture"
    model = "capture-v1"

    def __init__(self) -> None:
        self.messages: list[dict[str, str]] = []

    def chat(self, messages: list[dict[str, str]]) -> str:
        self.messages = messages
        return "Grounded response."


def test_copilot_context_includes_resume_analysis_and_prep_plan() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with session_factory() as db:
            user = User(
                id=uuid4(),
                clerk_user_id="copilot-owner",
                email="copilot@example.com",
                name="Owner",
            )
            db.add(user)
            db.flush()
            resume = ResumeVersion(
                user_id=user.id,
                name="Backend Resume",
                target_role="Backend Engineer",
                extracted_text="Built FastAPI and PostgreSQL services.",
            )
            db.add(resume)
            db.flush()
            analysis = ResumeAnalysis(
                user_id=user.id,
                resume_version_id=resume.id,
                target_role="Backend Engineer",
                overall_score=82,
                keyword_score=78,
                strengths=["API ownership"],
                risks=["Limited Go evidence"],
                missing_keywords=["Go"],
                recommendations=["Prepare a systems example"],
                status="completed",
            )
            db.add(analysis)
            db.flush()
            application = Application(
                user_id=user.id,
                company="Acme",
                role="Backend Engineer",
                job_description="Build Go and Python distributed systems.",
                resume_version_id=resume.id,
                resume_analysis_id=analysis.id,
            )
            db.add(application)
            db.flush()
            db.add(
                ApplicationPrepPlan(
                    user_id=user.id,
                    application_id=application.id,
                    coding={"priority_topics": [{"topic": "graphs"}]},
                    behavioral={"focus_areas": [{"category": "ownership"}]},
                    system_design={"focus_areas": [{"topic": "queues"}]},
                    overall_preparation_summary="Prioritize systems fundamentals.",
                    next_best_action="Practice a queue design.",
                )
            )
            db.commit()

            provider = CaptureProvider()
            result = ApplicationCopilotService(
                db,
                Settings(app_env="test"),
                provider,
            ).send(
                user.id,
                application.id,
                ApplicationCopilotRequest(message="How competitive am I?"),
            )
            serialized = "\n".join(message["content"] for message in provider.messages)
            assert result.message.content == "Grounded response."
            assert "Build Go and Python distributed systems" in serialized
            assert "Built FastAPI and PostgreSQL services" in serialized
            assert '"overall_score": 82' in serialized
            assert "Practice a queue design" in serialized
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_copilot_partial_context_and_cross_user_access() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with session_factory() as db:
            owner = User(
                id=uuid4(),
                clerk_user_id="copilot-owner-2",
                email="copilot-owner-2@example.com",
                name="Owner",
            )
            other = User(
                id=uuid4(),
                clerk_user_id="copilot-other",
                email="copilot-other@example.com",
                name="Other",
            )
            db.add_all([owner, other])
            db.flush()
            application = Application(
                user_id=owner.id,
                company="Acme",
                role="Software Engineer",
            )
            db.add(application)
            db.commit()
            service = ApplicationCopilotService(
                db,
                Settings(app_env="test"),
                CaptureProvider(),
            )

            response = service.send(
                owner.id,
                application.id,
                ApplicationCopilotRequest(message="Summarize the role."),
            )
            assert response.message.content == "Grounded response."
            with pytest.raises(NotFoundError):
                service.history(other.id, application.id)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
