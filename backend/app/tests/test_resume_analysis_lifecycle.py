from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.resume_analysis import ResumeAnalysisCreate
from app.services import resume_analysis as resume_analysis_module
from app.services.ai_resume_analysis import OpenRouterProvider
from app.services.resume_analysis import ResumeAnalysisService


def test_openrouter_timeout_is_a_typed_analysis_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class TimeoutClient:
        def __init__(self, **_: object) -> None:
            pass

        def __enter__(self) -> "TimeoutClient":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def post(self, *_: object, **__: object) -> object:
            raise httpx.ReadTimeout("slow provider")

    monkeypatch.setattr("app.services.ai_resume_analysis.httpx.Client", TimeoutClient)
    provider = OpenRouterProvider("test-key", "test-model", timeout_seconds=240, connect_timeout_seconds=15)

    with pytest.raises(AppError, match="Resume analysis is taking longer") as error:
        provider._complete([{"role": "user", "content": "test"}])

    assert error.value.code == "ai_provider_timeout"
    assert error.value.status_code == 504


def test_duplicate_analysis_request_returns_existing_result_without_calling_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    user_id = uuid4()
    resume_id = uuid4()
    request_id = uuid4()
    existing = SimpleNamespace(id=uuid4())
    resume = SimpleNamespace(id=resume_id)

    class FakeSession:
        def scalar(self, _: object) -> object:
            return existing

    class FakeResumeService:
        def __init__(self, _: object) -> None:
            pass

        def get(self, _: object, __: object) -> object:
            return resume

    monkeypatch.setattr(resume_analysis_module, "ResumeService", FakeResumeService)
    monkeypatch.setattr(
        resume_analysis_module,
        "provider_from_settings",
        lambda _: (_ for _ in ()).throw(AssertionError("provider must not run for a duplicate request")),
    )

    payload = ResumeAnalysisCreate(
        target_role="Backend Engineer",
        job_description="Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
        resume_text="Built FastAPI services.",
        analysis_request_id=request_id,
    )
    analysis, returned_resume = ResumeAnalysisService(FakeSession(), Settings()).analyze(user_id, resume_id, payload)

    assert analysis is existing
    assert returned_resume is resume
