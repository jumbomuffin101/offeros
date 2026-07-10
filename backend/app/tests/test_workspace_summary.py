from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.models.user import User


def test_summary_routes_are_registered_in_openapi(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/dashboard/summary" in paths
    assert "get" in paths["/api/v1/dashboard/summary"]
    assert "/api/v1/analytics/summary" in paths
    assert "get" in paths["/api/v1/analytics/summary"]


def test_dashboard_summary_empty_workspace_returns_valid_summary(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    summary = response.json()["data"]
    assert summary["applications"] == []
    assert summary["resumes"] == []
    assert summary["coding_problems"] == []
    assert summary["behavioral_questions"] == []
    assert summary["system_design_prompts"] == []
    assert summary["dashboard"]["kpis"]["total_applications"] == 0
    assert summary["dashboard"]["kpis"]["resume_count"] == 0
    assert summary["analytics"]["total_applications"] == 0


def test_dashboard_summary_populated_workspace_returns_counts(client: TestClient) -> None:
    application_response = client.post(
        "/api/v1/applications",
        json={
            "company": "Acme",
            "role": "Software Engineering Intern",
            "status": "interview",
            "priority": "high",
        },
    )
    resume_response = client.post(
        "/api/v1/resumes",
        json={
            "name": "SWE Resume",
            "target_role": "Software Engineer",
            "status": "active",
            "keyword_match_score": 82,
        },
    )
    coding_response = client.post(
        "/api/v1/prep/coding",
        json={
            "title": "Two Sum",
            "difficulty": "easy",
            "topic": "Arrays",
            "target_time_minutes": 20,
            "status": "completed",
        },
    )

    assert application_response.status_code == 201
    assert resume_response.status_code == 201
    assert coding_response.status_code == 201

    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    summary = response.json()["data"]
    assert len(summary["applications"]) == 1
    assert len(summary["resumes"]) == 1
    assert len(summary["coding_problems"]) == 1
    assert summary["dashboard"]["kpis"]["total_applications"] == 1
    assert summary["dashboard"]["kpis"]["active_interviews"] == 1
    assert summary["dashboard"]["kpis"]["resume_count"] == 1
    assert summary["analytics"]["completed_coding_problems"] == 1


def test_dashboard_summary_only_returns_current_user_data(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/applications",
        json={
            "company": "Acme",
            "role": "Software Engineering Intern",
            "status": "applied",
            "priority": "medium",
        },
    )
    assert create_response.status_code == 201

    app.dependency_overrides[get_current_user] = _second_user
    try:
        response = client.get("/api/v1/dashboard/summary")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    summary = response.json()["data"]
    assert summary["applications"] == []
    assert summary["dashboard"]["kpis"]["total_applications"] == 0


def test_analytics_summary_route_returns_workspace_summary(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/summary")

    assert response.status_code == 200
    summary = response.json()["data"]
    assert "applications" in summary
    assert "analytics" in summary
    assert summary["analytics"]["total_applications"] == 0


def test_summary_routes_require_authentication_when_auth_required(client: TestClient) -> None:
    previous_settings_override = app.dependency_overrides.get(get_settings)
    app.dependency_overrides[get_settings] = lambda: Settings(app_env="test", auth_required=True)
    try:
        dashboard_response = client.get("/api/v1/dashboard/summary")
        analytics_response = client.get("/api/v1/analytics/summary")
    finally:
        if previous_settings_override is None:
            app.dependency_overrides.pop(get_settings, None)
        else:
            app.dependency_overrides[get_settings] = previous_settings_override

    assert dashboard_response.status_code == 401
    assert analytics_response.status_code == 401


def _second_user(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.clerk_user_id == "summary_test_user_2"))
    if user is not None:
        return user
    user = User(
        clerk_user_id="summary_test_user_2",
        email="summary-test-user-2@offeros.local",
        name="Summary Test User 2",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
