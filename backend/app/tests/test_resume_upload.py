from io import BytesIO
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.errors import NotFoundError
from app.models.base import Base
from app.models.resume import ResumeVersion
from app.models.user import User
from app.services.resumes import ResumeService
from app.main import app


def test_resume_upload_route_is_registered() -> None:
    routes = {
        getattr(route, "path", ""): getattr(route, "methods", set())
        for route in app.routes
    }

    assert "/api/v1/resumes/{resume_id}/upload" in routes
    assert "POST" in routes["/api/v1/resumes/{resume_id}/upload"]


def test_upload_txt_resume_extracts_text(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "Upload Resume", "target_role": "Software Engineer"},
    ).json()["data"]

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={
            "file": (
                "aryan-resume.txt",
                b"Software Engineer\n\nExperience\n- Built FastAPI services with PostgreSQL and tests.",
                "text/plain",
            )
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["resume"]["original_file_name"] == "aryan-resume.txt"
    assert data["resume"]["text_extraction_status"] == "parsed"
    assert data["resume"]["extracted_text"].startswith("Software Engineer")
    assert data["extraction"]["character_count"] > 0


def test_upload_rejects_unsupported_file(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "Upload Resume", "target_role": "Software Engineer"},
    ).json()["data"]

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={"file": ("resume.png", b"not a resume", "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_upload_rejects_oversized_file(client: TestClient) -> None:
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "Upload Resume", "target_role": "Software Engineer"},
    ).json()["data"]

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={"file": ("resume.txt", b"x" * (5 * 1024 * 1024 + 1), "text/plain")},
    )

    assert response.status_code == 422
    assert "5 MB" in response.json()["error"]["message"]


def test_upload_pdf_resume_extracts_text(client: TestClient) -> None:
    fitz = pytest.importorskip("fitz")
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "PDF Resume", "target_role": "Software Engineer"},
    ).json()["data"]
    document = fitz.open()
    page = document.new_page()
    page.insert_text(
        (72, 72),
        "Software Engineer resume with Python FastAPI PostgreSQL testing APIs Docker reliability and backend project delivery.",
    )
    content = document.tobytes()
    document.close()

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={"file": ("resume.pdf", content, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["extraction"]["page_count"] == 1
    assert "FastAPI" in data["resume"]["extracted_text"]


def test_upload_docx_resume_extracts_text(client: TestClient) -> None:
    docx = pytest.importorskip("docx")
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "DOCX Resume", "target_role": "Software Engineer"},
    ).json()["data"]
    document = docx.Document()
    document.add_paragraph("Software Engineer resume with React TypeScript Python APIs and PostgreSQL.")
    output = BytesIO()
    document.save(output)

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={"file": ("resume.docx", output.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )

    assert response.status_code == 200
    assert "TypeScript" in response.json()["data"]["resume"]["extracted_text"]


def test_upload_scanned_pdf_returns_clear_error(client: TestClient) -> None:
    fitz = pytest.importorskip("fitz")
    resume = client.post(
        "/api/v1/resumes",
        json={"name": "Scanned Resume", "target_role": "Software Engineer"},
    ).json()["data"]
    document = fitz.open()
    document.new_page()
    content = document.tobytes()
    document.close()

    response = client.post(
        f"/api/v1/resumes/{resume['id']}/upload",
        files={"file": ("scanned.pdf", content, "application/pdf")},
    )

    assert response.status_code == 422
    assert "OCR support is not available yet" in response.json()["error"]["message"]


def test_user_cannot_upload_to_another_users_resume() -> None:
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
            resume = ResumeVersion(user_id=owner.id, name="Owner Resume", target_role="SWE")
            session.add(resume)
            session.commit()

            with pytest.raises(NotFoundError):
                ResumeService(session).upload(
                    other.id,
                    resume.id,
                    filename="resume.txt",
                    content_type="text/plain",
                    content=b"Software Engineer resume text",
                )
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
