from fastapi.testclient import TestClient


def test_analyze_resume_without_text_returns_422(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/resumes",
        json={"name": "Backend Resume", "target_role": "Backend Engineer"},
    )
    resume_id = create_response.json()["data"]["id"]

    response = client.post(
        f"/api/v1/resumes/{resume_id}/analyze",
        json={"target_role": "Backend Engineer", "job_description": ""},
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
        json={"target_role": "Backend Engineer", "job_description": "Python FastAPI PostgreSQL Docker testing"},
    )
    history_response = client.get(f"/api/v1/resumes/{resume_id}/analyses")

    assert response.status_code == 200
    analysis = response.json()["data"]
    assert analysis["provider"] == "mock"
    assert 0 <= analysis["overall_score"] <= 100
    assert isinstance(analysis["missing_keywords"], list)
    assert isinstance(analysis["weak_bullets"], list)
    if analysis["weak_bullets"]:
        assert set(analysis["weak_bullets"][0]) == {"original", "issue", "suggestion"}
    assert isinstance(analysis["suggested_bullet_rewrites"], list)
    if analysis["suggested_bullet_rewrites"]:
        assert "why_better" in analysis["suggested_bullet_rewrites"][0]
    assert history_response.status_code == 200
    assert history_response.json()["data"][0]["id"] == analysis["id"]
