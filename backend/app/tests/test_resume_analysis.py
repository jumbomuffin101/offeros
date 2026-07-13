from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.models.base import Base
from app.models.resume import ResumeVersion
from app.models.user import User
from app.services.ai_resume_analysis import parse_analysis_result
from app.schemas.resume_analysis import ResumeAnalysisCreate
from app.services.resume_analysis import ResumeAnalysisService


def test_analyze_resume_without_text_returns_422(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/resumes",
        json={"name": "Backend Resume", "target_role": "Backend Engineer"},
    )
    resume_id = create_response.json()["data"]["id"]

    response = client.post(
        f"/api/v1/resumes/{resume_id}/analyze",
        json={"target_role": "Backend Engineer", "job_description": "Python FastAPI backend engineer role with APIs, PostgreSQL, testing, Docker, and ownership of reliable production services."},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_analyze_resume_mock_schema_is_valid(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/resumes",
        json={
            "name": "Backend Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "- Built FastAPI services with PostgreSQL and Docker\n- Reduced API latency by 35%",
        },
    )
    resume_id = create_response.json()["data"]["id"]

    response = client.post(
        f"/api/v1/resumes/{resume_id}/analyze",
        json={"target_role": "Backend Engineer", "company_name": "Acme", "job_description": "Python FastAPI backend engineer role with APIs, PostgreSQL, testing, Docker, and ownership of reliable production services."},
    )
    history_response = client.get(f"/api/v1/resumes/{resume_id}/analyses")

    assert response.status_code == 200
    data = response.json()["data"]
    analysis = data["analysis"]
    resume = data["resume"]
    assert analysis["provider"] == "mock"
    assert 0 <= analysis["overall_score"] <= 100
    assert isinstance(analysis["missing_keywords"], list)
    assert isinstance(analysis["weak_bullets"], list)
    if analysis["weak_bullets"]:
        assert set(analysis["weak_bullets"][0]) == {"original", "issue", "suggestion"}
    assert isinstance(analysis["suggested_bullet_rewrites"], list)
    assert analysis["company_name"] == "Acme"
    assert isinstance(analysis["required_skills_match"], list)
    assert "experience_match_score" in analysis
    assert resume["keyword_match_score"] == analysis["keyword_score"]
    assert resume["latest_overall_score"] == analysis["overall_score"]
    assert resume["latest_analysis_id"] == analysis["id"]
    assert resume["latest_analysis_target_role"] == "Backend Engineer"
    assert resume["latest_analysis_company"] == "Acme"
    assert resume["analysis_status"] == "completed"
    if analysis["suggested_bullet_rewrites"]:
        assert "why_better" in analysis["suggested_bullet_rewrites"][0]
    assert history_response.status_code == 200
    assert history_response.json()["data"][0]["id"] == analysis["id"]


def test_malformed_ai_result_is_rejected() -> None:
    with pytest.raises(AppError) as exc_info:
        parse_analysis_result('{"overall_score": "not-json-complete"')
    assert exc_info.value.code == "ai_malformed_response"


def test_user_cannot_access_another_users_analysis() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with Session() as session:
            owner = User(id=uuid4(), clerk_user_id="owner", email="owner@example.com", name="Owner")
            other = User(id=uuid4(), clerk_user_id="other", email="other@example.com", name="Other")
            session.add_all([owner, other])
            session.flush()
            resume = ResumeVersion(
                user_id=owner.id,
                name="Owner Resume",
                target_role="Backend Engineer",
                extracted_text="Built Python FastAPI services with PostgreSQL, Docker, testing, APIs, and reliability work.",
            )
            session.add(resume)
            session.commit()

            service = ResumeAnalysisService(
                session,
                Settings(app_env="test", auth_required=False, ai_mock_enabled=True),
            )
            analysis, _resume = service.analyze(
                owner.id,
                resume.id,
                ResumeAnalysisCreate(
                    target_role="Backend Engineer",
                    job_description="Backend engineer role requiring FastAPI, PostgreSQL, Docker, testing, API ownership, and reliable production service experience.",
                ),
            )

            with pytest.raises(NotFoundError):
                service.get(other.id, analysis.id)
            with pytest.raises(NotFoundError):
                service.list_for_resume(other.id, resume.id)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_deleting_latest_analysis_recalculates_resume_summary(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={
            "name": "Backend Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "- Built FastAPI services with PostgreSQL and Docker\n- Reduced API latency by 35%",
        },
    ).json()["data"]

    first = client.post(
        f"/api/v1/resumes/{resume['id']}/analyze",
        json={"target_role": "Backend Engineer", "company_name": "Acme", "job_description": "Python FastAPI backend engineer role with APIs, PostgreSQL, testing, Docker, and ownership of reliable production services."},
    ).json()["data"]["analysis"]
    second = client.post(
        f"/api/v1/resumes/{resume['id']}/analyze",
        json={"target_role": "Platform Engineer", "company_name": "Beta", "job_description": "Platform engineering role requiring Python, Docker, PostgreSQL, CI testing, backend APIs, and production reliability ownership."},
    ).json()["data"]["analysis"]

    delete_response = client.delete(f"/api/v1/resume-analyses/{second['id']}")
    updated = client.get(f"/api/v1/resumes/{resume['id']}").json()["data"]

    assert delete_response.status_code == 204
    assert updated["latest_analysis_id"] == first["id"]
    assert updated["latest_analysis_target_role"] == first["target_role"]


def test_deleting_only_analysis_clears_resume_summary(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={
            "name": "Backend Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "- Built FastAPI services with PostgreSQL and Docker\n- Reduced API latency by 35%",
        },
    ).json()["data"]
    analysis = client.post(
        f"/api/v1/resumes/{resume['id']}/analyze",
        json={"target_role": "Backend Engineer", "company_name": "Acme", "job_description": "Python FastAPI backend engineer role with APIs, PostgreSQL, testing, Docker, and ownership of reliable production services."},
    ).json()["data"]["analysis"]

    client.delete(f"/api/v1/resume-analyses/{analysis['id']}")
    updated = client.get(f"/api/v1/resumes/{resume['id']}").json()["data"]

    assert updated["latest_analysis_id"] is None
    assert updated["latest_overall_score"] is None
    assert updated["keyword_match_score"] == 0
