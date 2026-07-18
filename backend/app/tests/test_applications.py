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


def test_application_can_attach_resume_and_run_role_specific_analysis(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={
            "name": "Backend Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "Built Python FastAPI services with PostgreSQL, Docker, tests, APIs, and reliable production ownership.",
        },
    ).json()["data"]
    application = client.post(
        "/api/v1/applications",
        json={
            "company": "Acme",
            "role": "Backend Engineering Intern",
            "job_description": "Build reliable backend APIs using Python, FastAPI, PostgreSQL, Docker, automated testing, observability, and ownership of production services.",
        },
    ).json()["data"]

    assert application["resume_version_id"] is None
    attached = client.patch(
        f"/api/v1/applications/{application['id']}",
        json={"resume_version_id": resume["id"]},
    )
    analysis_response = client.post(
        f"/api/v1/applications/{application['id']}/analyze-resume",
        json={},
    )
    listed = client.get("/api/v1/applications")

    assert attached.status_code == 200
    assert attached.json()["data"]["resume_version_id"] == resume["id"]
    assert attached.json()["data"]["selected_resume_name"] == "Backend Resume"
    assert analysis_response.status_code == 200
    result = analysis_response.json()
    assert result["analysis"]["company_name"] == "Acme"
    assert result["analysis"]["target_role"] == "Backend Engineering Intern"
    assert result["analysis"]["job_description"] == application["job_description"]
    assert result["application"]["resume_analysis_id"] == result["analysis"]["id"]
    assert result["application"]["analysis_status"] == "completed"
    assert listed.status_code == 200
    summary = listed.json()["data"][0]
    assert summary["resume_analysis_id"] == result["analysis"]["id"]
    assert summary["analysis_overall_score"] == result["analysis"]["overall_score"]
    assert "required_skills_match" not in summary


def test_application_analysis_requires_saved_resume_and_job_description(client: TestClient) -> None:
    application = client.post(
        "/api/v1/applications",
        json={"company": "Acme", "role": "Backend Engineering Intern"},
    ).json()["data"]

    response = client.post(f"/api/v1/applications/{application['id']}/analyze-resume", json={})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
