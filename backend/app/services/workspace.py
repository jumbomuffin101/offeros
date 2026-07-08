from collections.abc import Callable
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.base import ApplicationStatus, Difficulty, PrepStatus, Priority, ResumeStatus
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.models.settings import UserSettings
from app.schemas.common import persistence_values
from app.schemas.workspace import WorkspaceResetRequest, WorkspaceResetResponse
from app.services.prep import PrepService


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def reset(self, user_id: UUID, payload: WorkspaceResetRequest) -> WorkspaceResetResponse:
        summary = WorkspaceResetResponse(
            scope=payload.scope,
            mode=payload.mode,
            deleted=_empty_counts(),
            created=_empty_created_counts(),
        )
        try:
            if payload.scope in {"all", "applications"}:
                summary.deleted["applications"] = self._delete(Application, user_id)
                applications = _reset_records(payload.mode, payload.applications, _demo_applications)
                for application in applications:
                    self.db.add(Application(user_id=user_id, **persistence_values(application)))
                summary.created["applications"] = len(applications)

            if payload.scope in {"all", "resumes"}:
                summary.deleted["analyses"] = self._delete(ResumeAnalysis, user_id)
                summary.deleted["resumes"] = self._delete(ResumeVersion, user_id)
                resumes = _reset_records(payload.mode, payload.resumes, _demo_resumes)
                for resume in resumes:
                    self.db.add(ResumeVersion(user_id=user_id, **persistence_values(resume)))
                summary.created["resumes"] = len(resumes)

            if payload.scope in {"all", "prep"}:
                summary.deleted["coding"] = self._delete(CodingProblem, user_id)
                summary.deleted["behavioral"] = self._delete(BehavioralQuestion, user_id)
                summary.deleted["systemDesign"] = self._delete(SystemDesignPrompt, user_id)
                coding_problems = _reset_records(payload.mode, payload.coding_problems, _demo_coding_problems)
                behavioral_questions = _reset_records(payload.mode, payload.behavioral_questions, _demo_behavioral_questions)
                system_design_prompts = _reset_records(payload.mode, payload.system_design_prompts, _demo_system_design_prompts)
                for problem in coding_problems:
                    values = persistence_values(problem)
                    PrepService._set_completion(CodingProblem, values)
                    self.db.add(CodingProblem(user_id=user_id, **values))
                for question in behavioral_questions:
                    self.db.add(BehavioralQuestion(user_id=user_id, **persistence_values(question)))
                for prompt in system_design_prompts:
                    self.db.add(SystemDesignPrompt(user_id=user_id, **persistence_values(prompt)))
                summary.created["coding"] = len(coding_problems)
                summary.created["behavioral"] = len(behavioral_questions)
                summary.created["systemDesign"] = len(system_design_prompts)

            if payload.scope == "all" and payload.mode == "empty":
                self._delete(UserSettings, user_id)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return summary

    def _delete(self, model: type, user_id: UUID) -> int:
        result = self.db.execute(delete(model).where(model.user_id == user_id))
        return int(result.rowcount or 0)


def _empty_counts() -> dict[str, int]:
    return {
        "applications": 0,
        "resumes": 0,
        "coding": 0,
        "behavioral": 0,
        "systemDesign": 0,
        "analyses": 0,
    }


def _empty_created_counts() -> dict[str, int]:
    return {
        "applications": 0,
        "resumes": 0,
        "coding": 0,
        "behavioral": 0,
        "systemDesign": 0,
    }


def _reset_records(mode: str, records: list[object], demo_factory: Callable[[], list[object]]) -> list[object]:
    if mode == "empty":
        return []
    if records:
        return records
    return demo_factory()


def _demo_applications() -> list[object]:
    from app.schemas.application import ApplicationCreate

    return [
        ApplicationCreate(company="Google", role="Software Engineer Intern", location="Mountain View, CA", status=ApplicationStatus.OA, source="Referral", resume_used="General SWE Resume", priority=Priority.HIGH, notes="OA invite received. Review arrays, strings, and recursion.", tags=["big-tech", "oa"]),
        ApplicationCreate(company="Capital One", role="Technology Intern", location="McLean, VA", status=ApplicationStatus.OFFER, source="Referral", resume_used="Backend Resume", priority=Priority.HIGH, notes="Offer deadline soon. Compare team matching and location.", tags=["offer", "backend"]),
        ApplicationCreate(company="Datadog", role="Software Engineer Intern", location="New York, NY", status=ApplicationStatus.APPLYING, source="Careers site", resume_used="Backend Resume", priority=Priority.MEDIUM, notes="Need observability keyword pass before submitting.", tags=["observability", "backend"]),
    ]


def _demo_resumes() -> list[object]:
    from app.schemas.resume import ResumeCreate

    return [
        ResumeCreate(name="General SWE Resume", target_role="Software Engineer", description="Broad full-stack and backend version for general software engineering roles.", status=ResumeStatus.ACTIVE, keyword_match_score=86, tags=["Full-stack", "Backend", "TypeScript"], strengths=["Product delivery", "API design"], weaknesses=["Few scale metrics"], missing_keywords=["Kafka", "Kubernetes"], suggested_improvement="Add production scale and latency metrics.", notes="Default version.", file_name="general-swe.pdf", original_file_name="general-swe.pdf"),
        ResumeCreate(name="Backend Resume", target_role="Backend Engineer", description="APIs, databases, reliability, and measurable performance.", status=ResumeStatus.ACTIVE, keyword_match_score=91, tags=["Distributed systems", "Postgres"], strengths=["API design", "Database systems"], weaknesses=["Testing details"], missing_keywords=["Contract testing"], suggested_improvement="Add test coverage and incident response details.", notes="Strong backend version.", file_name="backend.pdf", original_file_name="backend.pdf"),
    ]


def _demo_coding_problems() -> list[object]:
    from app.schemas.prep import CodingProblemCreate

    return [
        CodingProblemCreate(title="Longest Substring Without Repeating Characters", difficulty=Difficulty.MEDIUM, topic="Sliding window", target_time_minutes=35, status=PrepStatus.IN_PROGRESS, notes="Explain why the left pointer never moves backward."),
        CodingProblemCreate(title="Merge Intervals", difficulty=Difficulty.MEDIUM, topic="Intervals", target_time_minutes=30, status=PrepStatus.NOT_STARTED, notes="Sort by start and merge overlaps."),
    ]


def _demo_behavioral_questions() -> list[object]:
    from app.schemas.prep import BehavioralQuestionCreate

    return [
        BehavioralQuestionCreate(question="Tell me about a difficult technical problem.", category="Problem solving", star_situation="A data import timed out at scale.", star_task="Find the bottleneck and restore reliability.", star_action="Profiled queries and batched repeated lookups.", star_result="Runtime fell significantly and the release shipped on time.", confidence_score=3, status=PrepStatus.IN_PROGRESS),
    ]


def _demo_system_design_prompts() -> list[object]:
    from app.schemas.prep import SystemDesignPromptCreate

    return [
        SystemDesignPromptCreate(title="Design a URL shortener", prompt="Design a URL shortener with analytics and abuse prevention.", concepts=["hashing", "caching", "rate limits"], status=PrepStatus.NOT_STARTED, notes="Focus on APIs, storage, and hot-link caching."),
    ]
