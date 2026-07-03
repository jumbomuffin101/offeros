from fastapi.testclient import TestClient


def test_create_and_list_application(client: TestClient) -> None:
    payload = {
        "company": "Acme",
        "role": "Backend Engineering Intern",
        "location": "New York, NY",
        "status": "applied",
        "date_applied": "2026-07-03",
        "deadline": "2026-07-20",
        "source": "company_site",
        "job_url": "https://example.com/jobs/123",
        "priority": "high",
        "tags": ["backend", "internship"],
    }

    create_response = client.post("/api/v1/applications", json=payload)

    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["company"] == "Acme"
    assert created["status"] == "applied"

    list_response = client.get("/api/v1/applications")

    assert list_response.status_code == 200
    applications = list_response.json()["data"]
    assert len(applications) == 1
    assert applications[0]["id"] == created["id"]
