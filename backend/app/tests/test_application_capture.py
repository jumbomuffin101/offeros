from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.errors import ValidationError
from app.models.base import Base
from app.models.resume import ResumeVersion
from app.models.user import User
from app.schemas.application import ApplicationCaptureRequest
from app.services.application_capture import ApplicationCaptureService


def payload(**overrides: object) -> dict[str, object]:
    value: dict[str, object] = {"company": "Acme", "role": "Software Engineer", "location": "New York", "job_url": "https://boards.greenhouse.io/acme/jobs/123?utm_source=test", "job_description": "Build reliable distributed systems and APIs.", "source": "greenhouse", "external_job_id": "123", "run_resume_analysis": False, "generate_prep_plan": False}
    value.update(overrides); return value


def test_capture_creates_application_and_persists_description(client: TestClient) -> None:
    response = client.post("/api/v1/applications/capture", json=payload())
    assert response.status_code == 200
    assert response.json()["status"] == "created"
    listed = client.get("/api/v1/applications").json()["data"]
    assert listed[0]["job_description"].startswith("Build reliable")
    assert listed[0]["external_job_id"] == "123"


def test_capture_duplicate_url_returns_existing_application(client: TestClient) -> None:
    first = client.post("/api/v1/applications/capture", json=payload())
    second = client.post("/api/v1/applications/capture", json=payload(job_url="https://boards.greenhouse.io/acme/jobs/123?utm_campaign=again"))
    assert second.json()["status"] == "duplicate"
    assert second.json()["application"]["id"] == first.json()["application"]["id"]


def test_capture_duplicate_external_id_returns_existing_application(client: TestClient) -> None:
    first = client.post("/api/v1/applications/capture", json=payload(job_url="https://jobs.example.com/one"))
    second = client.post("/api/v1/applications/capture", json=payload(job_url="https://jobs.example.com/two"))
    assert second.json()["status"] == "duplicate"
    assert second.json()["application"]["id"] == first.json()["application"]["id"]


def test_capture_rejects_invalid_url_and_oversized_description(client: TestClient) -> None:
    assert client.post("/api/v1/applications/capture", json=payload(job_url="not-a-url")).status_code == 422
    assert client.post("/api/v1/applications/capture", json=payload(job_description="x" * 40_001)).status_code == 422


def test_capture_attaches_owned_resume_and_skips_optional_work(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "Backend Resume", "target_role": "Backend Engineer"},
    ).json()["data"]

    response = client.post(
        "/api/v1/applications/capture",
        json=payload(resume_version_id=resume["id"]),
    )

    assert response.status_code == 200
    result = response.json()
    assert result["application"]["resume_version_id"] == resume["id"]
    assert result["analysis"] is None
    assert result["prep_plan"] is None


def test_capture_rejects_resume_owned_by_another_user() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with session_factory() as session:
            owner = User(
                id=uuid4(),
                clerk_user_id="capture-owner",
                email="capture-owner@example.com",
                name="Owner",
            )
            other = User(
                id=uuid4(),
                clerk_user_id="capture-other",
                email="capture-other@example.com",
                name="Other",
            )
            session.add_all([owner, other])
            session.flush()
            resume = ResumeVersion(
                user_id=owner.id,
                name="Owner Resume",
                target_role="Software Engineer",
            )
            session.add(resume)
            session.commit()

            request = ApplicationCaptureRequest.model_validate(
                payload(resume_version_id=str(resume.id))
            )
            with pytest.raises(ValidationError):
                ApplicationCaptureService(session).capture(other.id, request)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
