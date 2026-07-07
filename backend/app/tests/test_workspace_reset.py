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
    assert second_reset.json()["data"]["applications"] == 2
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
            "applications": [],
            "resumes": [],
            "coding_problems": [],
            "behavioral_questions": [],
            "system_design_prompts": [],
        },
    )

    assert response.status_code == 200
    assert client.get("/api/v1/applications").json()["data"] == []
