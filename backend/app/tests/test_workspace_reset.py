from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.application import Application
from app.models.base import ApplicationStatus, Base
from app.models.user import User
from app.schemas.workspace import WorkspaceResetRequest
from app.services.workspace import WorkspaceService


def test_workspace_reset_all_sample_matches_contract(client: TestClient) -> None:
    response = client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "sample"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["scope"] == "all"
    assert data["mode"] == "sample"
    assert set(data["deleted"]) == {"applications", "resumes", "resumeAnalyses", "coding", "behavioral", "systemDesign"}
    assert set(data["created"]) == {"applications", "resumes", "coding", "behavioral", "systemDesign"}
    assert data["created"]["applications"] > 0
    assert data["created"]["resumes"] > 0
    assert data["created"]["coding"] > 0
    assert data["created"]["behavioral"] > 0
    assert data["created"]["systemDesign"] > 0


def test_workspace_reset_all_empty_clears_workspace(client: TestClient) -> None:
    client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "sample"})

    response = client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "empty"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["mode"] == "empty"
    assert all(value == 0 for value in data["created"].values())
    assert client.get("/api/v1/applications").json()["data"] == []
    assert client.get("/api/v1/resumes").json()["data"] == []
    assert client.get("/api/v1/prep/coding").json()["data"] == []
    assert client.get("/api/v1/prep/behavioral").json()["data"] == []
    assert client.get("/api/v1/prep/system-design").json()["data"] == []


def test_workspace_reset_applications_sample_replaces_only_applications(client: TestClient) -> None:
    client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "empty"})
    resume = client.post("/api/v1/resumes", json={"name": "Custom Resume", "target_role": "SWE"}).json()["data"]

    response = client.post("/api/v1/workspace/reset", json={"scope": "applications", "mode": "sample"})

    assert response.status_code == 200
    assert response.json()["data"]["created"]["applications"] > 0
    assert client.get("/api/v1/applications").json()["data"]
    resumes = client.get("/api/v1/resumes").json()["data"]
    assert [item["id"] for item in resumes] == [resume["id"]]


def test_workspace_reset_resumes_sample_creates_valid_resumes_and_clears_analyses(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={
            "name": "Backend Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "- Built FastAPI services with PostgreSQL and Docker",
        },
    ).json()["data"]
    client.post(
        f"/api/v1/resumes/{resume['id']}/analyze",
        json={"target_role": "Backend Engineer", "job_description": "Backend engineer role requiring FastAPI, PostgreSQL, Docker, testing, API ownership, and reliable production service experience."},
    )

    response = client.post("/api/v1/workspace/reset", json={"scope": "resumes", "mode": "sample"})
    resumes = client.get("/api/v1/resumes").json()["data"]

    assert response.status_code == 200
    assert response.json()["data"]["deleted"]["resumeAnalyses"] == 1
    assert response.json()["data"]["created"]["resumes"] == len(resumes)
    assert all(resume["original_file_name"] is not None for resume in resumes)
    assert all(resume["extracted_text"] is not None for resume in resumes)
    assert all(resume["text_extraction_status"] for resume in resumes)
    assert all(resume["text_extraction_error"] is not None for resume in resumes)


def test_workspace_reset_prep_sample_replaces_prep_only(client: TestClient) -> None:
    client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "empty"})
    application = client.post(
        "/api/v1/applications",
        json={"company": "Acme", "role": "SWE Intern", "status": "applied"},
    ).json()["data"]

    response = client.post("/api/v1/workspace/reset", json={"scope": "prep", "mode": "sample"})

    assert response.status_code == 200
    assert response.json()["data"]["created"]["coding"] > 0
    assert response.json()["data"]["created"]["behavioral"] > 0
    assert response.json()["data"]["created"]["systemDesign"] > 0
    applications = client.get("/api/v1/applications").json()["data"]
    assert [item["id"] for item in applications] == [application["id"]]


def test_workspace_reset_applications_empty_leaves_applications_empty(client: TestClient) -> None:
    client.post("/api/v1/workspace/reset", json={"scope": "applications", "mode": "sample"})

    response = client.post("/api/v1/workspace/reset", json={"scope": "applications", "mode": "empty"})

    assert response.status_code == 200
    assert response.json()["data"]["created"]["applications"] == 0
    assert client.get("/api/v1/applications").json()["data"] == []


def test_workspace_reset_resumes_empty_deletes_resumes_and_analyses(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={
            "name": "Analysis Resume",
            "target_role": "Backend Engineer",
            "extracted_text": "- Built FastAPI services with PostgreSQL and Docker",
        },
    ).json()["data"]
    client.post(
        f"/api/v1/resumes/{resume['id']}/analyze",
        json={"target_role": "Backend Engineer", "job_description": "Backend engineer role requiring FastAPI, PostgreSQL, Docker, testing, API ownership, and reliable production service experience."},
    )

    response = client.post("/api/v1/workspace/reset", json={"scope": "resumes", "mode": "empty"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["created"]["resumes"] == 0
    assert data["deleted"]["resumes"] == 1
    assert data["deleted"]["resumeAnalyses"] == 1
    assert client.get("/api/v1/resumes").json()["data"] == []


def test_workspace_reset_prep_empty_leaves_prep_empty(client: TestClient) -> None:
    client.post("/api/v1/workspace/reset", json={"scope": "prep", "mode": "sample"})

    response = client.post("/api/v1/workspace/reset", json={"scope": "prep", "mode": "empty"})

    assert response.status_code == 200
    assert response.json()["data"]["created"]["coding"] == 0
    assert client.get("/api/v1/prep/coding").json()["data"] == []
    assert client.get("/api/v1/prep/behavioral").json()["data"] == []
    assert client.get("/api/v1/prep/system-design").json()["data"] == []


def test_workspace_reset_sample_is_idempotent(client: TestClient) -> None:
    first = client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "sample"}).json()["data"]
    second = client.post("/api/v1/workspace/reset", json={"scope": "all", "mode": "sample"}).json()["data"]

    assert second["created"] == first["created"]
    assert len(client.get("/api/v1/applications").json()["data"]) == first["created"]["applications"]
    assert len(client.get("/api/v1/resumes").json()["data"]) == first["created"]["resumes"]
    assert len(client.get("/api/v1/prep/coding").json()["data"]) == first["created"]["coding"]


def test_workspace_reset_accepts_legacy_demo_alias(client: TestClient) -> None:
    response = client.post("/api/v1/workspace/reset", json={"scope": "applications", "mode": "demo"})

    assert response.status_code == 200
    assert response.json()["data"]["mode"] == "sample"
    assert response.json()["data"]["created"]["applications"] > 0


def test_workspace_reset_only_affects_selected_user() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    try:
        with Session() as session:
            first_user = User(id=uuid4(), clerk_user_id="first", email="first@example.com", name="First")
            second_user = User(id=uuid4(), clerk_user_id="second", email="second@example.com", name="Second")
            session.add_all([first_user, second_user])
            session.flush()
            session.add_all([
                Application(user_id=first_user.id, company="FirstCo", role="SWE", status=ApplicationStatus.APPLIED),
                Application(user_id=second_user.id, company="SecondCo", role="SWE", status=ApplicationStatus.APPLIED),
            ])
            session.commit()

            WorkspaceService(session).reset(
                first_user.id,
                WorkspaceResetRequest(scope="applications", mode="empty"),
            )

            remaining = list(session.scalars(select(Application).order_by(Application.company)))
            assert [application.company for application in remaining] == ["SecondCo"]
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
