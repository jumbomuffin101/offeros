from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.schemas.resume import ResumeResponse


def test_list_resumes_returns_empty_list(client: TestClient) -> None:
    response = client.get("/api/v1/resumes")

    assert response.status_code == 200
    assert response.json()["data"] == []


def test_create_and_list_resume(client: TestClient) -> None:
    payload = {
        "name": "Backend Resume",
        "target_role": "Backend Engineer",
        "description": "Focused on APIs, databases, and reliability.",
        "status": "active",
        "keyword_match_score": 91,
        "tags": ["Backend", "PostgreSQL"],
        "file_name": "backend.pdf",
    }

    create_response = client.post("/api/v1/resumes", json=payload)

    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["name"] == "Backend Resume"
    assert created["status"] == "active"
    assert created["original_file_name"] == ""
    assert created["extracted_text"] == ""

    list_response = client.get("/api/v1/resumes")

    assert list_response.status_code == 200
    resumes = list_response.json()["data"]
    assert len(resumes) == 1
    assert resumes[0]["id"] == created["id"]


def test_resume_demo_reset_creates_valid_list_rows(client: TestClient) -> None:
    response = client.post("/api/v1/workspace/reset", json={"scope": "resumes", "mode": "demo"})

    assert response.status_code == 200
    assert response.json()["data"]["created"]["resumes"] > 0

    list_response = client.get("/api/v1/resumes")
    resumes = list_response.json()["data"]

    assert list_response.status_code == 200
    assert len(resumes) == response.json()["data"]["created"]["resumes"]
    assert all(isinstance(resume["tags"], list) for resume in resumes)
    assert all(resume["text_extraction_status"] for resume in resumes)


def test_resume_response_normalizes_legacy_nullable_fields() -> None:
    now = datetime.now(UTC)
    response = ResumeResponse.model_validate(
        SimpleNamespace(
            id=uuid4(),
            user_id=uuid4(),
            name="Legacy Resume",
            target_role="Software Engineer",
            description=None,
            status=None,
            keyword_match_score=None,
            tags=None,
            strengths=None,
            weaknesses=None,
            missing_keywords=None,
            suggested_improvement=None,
            notes=None,
            file_name=None,
            original_file_name=None,
            extracted_text=None,
            text_extraction_status=None,
            text_extraction_error=None,
            created_at=now,
            updated_at=now,
        )
    )

    assert response.description == ""
    assert response.status == "draft"
    assert response.keyword_match_score == 0
    assert response.tags == []
    assert response.file_name == ""
