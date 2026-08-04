from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.career_intelligence.health import _resume_readiness
from app.models.application import Application
from app.models.base import ApplicationStatus, Base, Priority, ResumeStatus
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.user import User
from app.schemas.resume_analysis import ResumeAnalysisResult
from app.services.resume_intelligence import (
    ANALYSIS_SCHEMA_VERSION,
    MIN_OUTCOME_SAMPLE,
    ResumeCareerContextBuilder,
    build_comparison,
    calculate_resume_performance,
    deterministic_signals,
    find_comparable_analysis,
)


def prior_analysis(*, role: str = "Backend Engineer", mode: str = "target_role", schema: str = ANALYSIS_SCHEMA_VERSION):
    return SimpleNamespace(
        id=uuid4(), target_role=role, resume_version_id=uuid4(),
        overall_score=70, keyword_score=65, impact_score=60, clarity_score=80,
        technical_depth_score=72, experience_match_score=68,
        missing_keywords=["postgresql"], strengths=["Clear projects"], risks=["Impact is vague"],
        intelligence_json={"analysis_mode": mode, "analysis_schema_version": schema},
    )


def test_comparability_requires_mode_role_and_schema_compatibility() -> None:
    exact = prior_analysis()
    partial = prior_analysis(role="Platform Engineer")
    incompatible = prior_analysis(schema="legacy-v0")

    selected, status, basis, confidence = find_comparable_analysis(
        [incompatible, partial, exact], current_mode="target_role", target_role="Backend Engineer", application_id=None
    )
    assert selected is exact
    assert status == "comparable"
    assert "same_target_role" in basis
    assert confidence == 0.9

    selected, status, _, _ = find_comparable_analysis(
        [incompatible, partial], current_mode="target_role", target_role="Backend Engineer", application_id=None
    )
    assert selected is partial
    assert status == "partially_comparable"

    selected, status, _, _ = find_comparable_analysis(
        [incompatible], current_mode="target_role", target_role="Backend Engineer", application_id=None
    )
    assert selected is None
    assert status == "not_comparable"


def test_comparison_does_not_claim_improvement_without_comparable_analysis() -> None:
    result = ResumeAnalysisResult(overall_score=95, keyword_score=90)
    comparison = build_comparison(None, result, "not_comparable", ["different_role"], 0)
    assert comparison.status == "not_comparable"
    assert comparison.overall_delta is None
    assert comparison.improved_areas == []


def test_deterministic_signals_detect_objective_evidence_only() -> None:
    resume = SimpleNamespace(id=uuid4(), updated_at=datetime.now(UTC) - timedelta(days=100))
    performance = SimpleNamespace(status="sufficient", interview_rate=0.05, sample_size=10)
    application = SimpleNamespace(priority=Priority.HIGH, resume_analysis_id=None)
    prior = prior_analysis()
    second = prior_analysis()
    signals = deterministic_signals(
        resume,
        "- Built an API\n- Improved a service",
        [prior, second],
        performance,
        application,
    )
    codes = {row["code"] for row in signals}
    assert {"NO_QUANTIFIED_BULLETS", "RECURRING_KEYWORD_GAP", "STALE_RESUME_VERSION", "WEAK_INTERVIEW_CONVERSION", "HIGH_PRIORITY_APPLICATION_UNANALYZED"} <= codes


def test_application_performance_requires_sample_and_filters_role_family() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            user = User(id=uuid4(), clerk_user_id="resume-performance", email="performance@example.com", name="Test")
            resume = ResumeVersion(id=uuid4(), user_id=user.id, name="Backend", target_role="Backend Engineer", status=ResumeStatus.ACTIVE)
            db.add_all([user, resume])
            for index in range(MIN_OUTCOME_SAMPLE):
                db.add(Application(user_id=user.id, company=f"Company {index}", role="Backend Engineer", status=ApplicationStatus.INTERVIEW if index < 2 else ApplicationStatus.APPLIED, priority=Priority.MEDIUM, resume_version_id=resume.id))
            db.add(Application(user_id=user.id, company="Frontend Co", role="Frontend Engineer", status=ApplicationStatus.OFFER, priority=Priority.MEDIUM, resume_version_id=resume.id))
            db.commit()
            summary = calculate_resume_performance(db, user.id, resume.id, "backend")
            assert summary.status == "sufficient"
            assert summary.sample_size == MIN_OUTCOME_SAMPLE
            assert summary.interview_count == 2
            assert summary.interview_rate == 2 / MIN_OUTCOME_SAMPLE
            assert "correlation" in summary.statement.lower()
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_resume_context_projection_excludes_raw_resume_job_and_gmail_content() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            user = User(id=uuid4(), clerk_user_id="resume-context", email="context@example.com", name="Test")
            resume = ResumeVersion(user_id=user.id, name="Backend", target_role="Backend Engineer", extracted_text="PRIVATE RESUME CONTENT")
            db.add_all([user, resume])
            db.commit()
            context = ResumeCareerContextBuilder(db).build(user.id, resume, target_role="Backend Engineer", company_name="Acme", application=None, mode="target_role")
            serialized = str(context)
            assert "PRIVATE RESUME CONTENT" not in serialized
            assert "job_description" not in context
            assert "gmail" not in context
            assert "user_id" not in context
            assert context["resume"]["id"] == str(resume.id)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_completed_analysis_returns_longitudinal_intelligence(client: TestClient) -> None:
    resume = client.post("/api/v1/resumes", json={"name": "Backend", "target_role": "Backend Engineer", "extracted_text": "- Built FastAPI APIs\n- Reduced latency by 30%"}).json()["data"]
    payload = {"target_role": "Backend Engineer", "company_name": "Acme", "job_description": "Backend engineer role requiring Python, FastAPI, PostgreSQL, Docker, testing, APIs, reliability, observability, and production ownership."}
    first = client.post(f"/api/v1/resumes/{resume['id']}/analyze", json=payload)
    second = client.post(f"/api/v1/resumes/{resume['id']}/analyze", json=payload)
    assert first.status_code == 200
    assert second.status_code == 200
    intelligence = second.json()["analysis"]["intelligence_json"]
    assert intelligence["analysis_mode"] == "target_role"
    assert intelligence["comparison"]["status"] == "comparable"
    assert abs(intelligence["career_health_impact"]["resume_readiness_delta"]) <= 4
    listed = client.get("/api/v1/resumes").json()["data"][0]
    assert listed["comparison_status"] == "comparable"
    assert listed["trend_direction"] in {"improving", "stable", "declining"}


def test_application_analysis_remains_application_scoped(client: TestClient) -> None:
    resume = client.post("/api/v1/resumes", json={"name": "Backend", "target_role": "Backend Engineer", "extracted_text": "- Built FastAPI APIs with PostgreSQL\n- Reduced latency by 30%"}).json()["data"]
    application = client.post("/api/v1/applications", json={"company": "Acme", "role": "Backend Engineer", "status": "applied", "priority": "high", "resume_version_id": resume["id"], "job_description": "Backend engineer role requiring Python, FastAPI, PostgreSQL, Docker, testing, APIs, reliability, observability, and production ownership."}).json()["data"]
    response = client.post(f"/api/v1/applications/{application['id']}/analyze-resume", json={})
    assert response.status_code == 200
    intelligence = response.json()["analysis"]["intelligence_json"]
    assert intelligence["analysis_mode"] == "application"
    assert intelligence["application_id"] == application["id"]
    assert any(item["scope"] == "application" for item in intelligence["recommendations"])


def test_career_intelligence_failure_does_not_block_analysis(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ResumeCareerContextBuilder, "build", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("context unavailable")))
    resume = client.post("/api/v1/resumes", json={"name": "Backend", "target_role": "Backend Engineer", "extracted_text": "- Built FastAPI APIs\n- Reduced latency by 30%"}).json()["data"]
    response = client.post(f"/api/v1/resumes/{resume['id']}/analyze", json={"target_role": "Backend Engineer", "job_description": "Backend engineer role requiring Python, FastAPI, PostgreSQL, Docker, testing, APIs, reliability, observability, and production ownership."})
    assert response.status_code == 200
    assert response.json()["analysis"]["status"] == "completed"


def test_resume_health_contribution_is_bounded() -> None:
    analysis = SimpleNamespace(overall_score=100, intelligence_json={"career_health_impact": {"resume_readiness_delta": 99}})
    assert _resume_readiness(1, [analysis]) <= 90
    analysis.intelligence_json = {"career_health_impact": {"resume_readiness_delta": -99}}
    assert _resume_readiness(1, [analysis]) >= 35
