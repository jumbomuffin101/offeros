from fastapi.testclient import TestClient


def test_workspace_reset_replaces_user_applications_without_duplicates(client: TestClient) -> None:
    client.post(
        "/api/v1/applications",
        json={"company": "OldCo", "role": "SWE Intern", "status": "applied"},
    )

    payload = {
        "scope": "applications",
        "applications": [
            {"company": "Demo A", "role": "Backend Intern", "status": "applied"},
            {"company": "Demo B", "role": "Frontend Intern", "status": "interview"},
        ],
        "resumes": [],
        "coding_problems": [],
        "behavioral_questions": [],
        "system_design_prompts": [],
    }

    first_reset = client.post("/api/v1/workspace/reset", json=payload)
    second_reset = client.post("/api/v1/workspace/reset", json=payload)
    applications = client.get("/api/v1/applications").json()["data"]

    assert first_reset.status_code == 200
    assert second_reset.status_code == 200
    assert second_reset.json()["data"]["scope"] == "applications"
    assert second_reset.json()["data"]["mode"] == "demo"
    assert second_reset.json()["data"]["created"]["applications"] == 2
    assert {application["company"] for application in applications} == {"Demo A", "Demo B"}
    assert len(applications) == 2


def test_workspace_reset_can_start_with_empty_workspace(client: TestClient) -> None:
    client.post(
        "/api/v1/applications",
        json={"company": "Acme", "role": "SWE Intern", "status": "applied"},
    )

    response = client.post(
        "/api/v1/workspace/reset",
        json={
            "scope": "all",
            "mode": "empty",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["mode"] == "empty"
    assert client.get("/api/v1/applications").json()["data"] == []


def test_workspace_reset_resumes_deletes_analysis_history(client: TestClient) -> None:
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
        json={"target_role": "Backend Engineer", "job_description": "FastAPI PostgreSQL Docker"},
    ).json()["data"]

    response = client.post("/api/v1/workspace/reset", json={"scope": "resumes", "mode": "empty"})
    deleted_lookup = client.get(f"/api/v1/resume-analyses/{analysis['id']}")

    assert response.status_code == 200
    assert response.json()["data"]["deleted"]["resume_analyses"] == 1
    assert client.get("/api/v1/resumes").json()["data"] == []
    assert deleted_lookup.status_code == 404
