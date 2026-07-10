from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeVersion
from app.schemas.workspace_summary import WorkspaceSummaryResponse


class WorkspaceSummaryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def summary(self, user_id: UUID) -> WorkspaceSummaryResponse:
        applications = self._list(Application, user_id)
        resumes = self._list(ResumeVersion, user_id)
        coding_problems = self._list(CodingProblem, user_id)
        behavioral_questions = self._list(BehavioralQuestion, user_id)
        system_design_prompts = self._list(SystemDesignPrompt, user_id)
        as_of = datetime.now(UTC)
        return WorkspaceSummaryResponse(
            applications=applications,
            resumes=resumes,
            coding_problems=coding_problems,
            behavioral_questions=behavioral_questions,
            system_design_prompts=system_design_prompts,
            dashboard=self._dashboard(
                applications, resumes, coding_problems, behavioral_questions, system_design_prompts
            ),
            analytics=self._analytics(
                applications, resumes, coding_problems, behavioral_questions, system_design_prompts
            ),
            as_of=as_of,
        )

    def _list(self, model: type, user_id: UUID) -> list:
        statement = (
            select(model)
            .where(model.user_id == user_id, model.deleted_at.is_(None))
            .order_by(model.updated_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def _dashboard(
        self,
        applications: list[Application],
        resumes: list[ResumeVersion],
        coding_problems: list[CodingProblem],
        behavioral_questions: list[BehavioralQuestion],
        system_design_prompts: list[SystemDesignPrompt],
    ) -> dict[str, object]:
        status_counts = self._application_status_counts(applications)
        prep_completed = self._completed_count(coding_problems) + self._completed_count(behavioral_questions) + self._completed_count(system_design_prompts)
        prep_total = len(coding_problems) + len(behavioral_questions) + len(system_design_prompts)
        return {
            "kpis": {
                "total_applications": len(applications),
                "active_interviews": status_counts.get("interview", 0) + status_counts.get("final_round", 0),
                "oas_pending": status_counts.get("oa", 0),
                "offers": status_counts.get("offer", 0),
                "response_rate": self._response_rate(applications),
                "resume_count": len(resumes),
                "weekly_prep_completion": round((prep_completed / prep_total) * 100) if prep_total else 0,
            },
            "pipeline_counts": status_counts,
            "deadlines": [
                {
                    "id": str(application.id),
                    "company": application.company,
                    "role": application.role,
                    "deadline": application.deadline.isoformat() if application.deadline else None,
                    "status": application.status.value,
                }
                for application in sorted(
                    (item for item in applications if item.deadline is not None),
                    key=lambda item: item.deadline,
                )[:6]
            ],
            "activity": self._activity(applications, resumes, coding_problems, behavioral_questions, system_design_prompts),
            "prep_summary": {
                "coding_completed": self._completed_count(coding_problems),
                "behavioral_completed": self._completed_count(behavioral_questions),
                "system_design_completed": self._completed_count(system_design_prompts),
                "total_completed": prep_completed,
            },
            "momentum": {
                "applications_this_week": self._recent_count(applications),
                "prep_completed_this_week": self._recent_completed_count(coding_problems)
                + self._recent_completed_count(behavioral_questions)
                + self._recent_completed_count(system_design_prompts),
            },
        }

    def _analytics(
        self,
        applications: list[Application],
        resumes: list[ResumeVersion],
        coding_problems: list[CodingProblem],
        behavioral_questions: list[BehavioralQuestion],
        system_design_prompts: list[SystemDesignPrompt],
    ) -> dict[str, object]:
        status_counts = self._application_status_counts(applications)
        return {
            "total_applications": len(applications),
            "application_statuses": status_counts,
            "total_resumes": len(resumes),
            "completed_coding_problems": self._completed_count(coding_problems),
            "completed_behavioral_questions": self._completed_count(behavioral_questions),
            "completed_system_design_prompts": self._completed_count(system_design_prompts),
            "response_rate": self._response_rate(applications),
        }

    def _application_status_counts(self, applications: list[Application]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for application in applications:
            counts[application.status.value] = counts.get(application.status.value, 0) + 1
        return counts

    def _completed_count(self, items: list) -> int:
        return sum(1 for item in items if getattr(item.status, "value", item.status) == "completed")

    def _recent_count(self, items: list) -> int:
        threshold = datetime.now(UTC).timestamp() - 7 * 86_400
        return sum(1 for item in items if item.created_at and item.created_at.timestamp() >= threshold)

    def _recent_completed_count(self, items: list) -> int:
        threshold = datetime.now(UTC).timestamp() - 7 * 86_400
        return sum(
            1
            for item in items
            if getattr(item.status, "value", item.status) == "completed"
            and item.updated_at
            and item.updated_at.timestamp() >= threshold
        )

    def _response_rate(self, applications: list[Application]) -> int:
        submitted = [
            item
            for item in applications
            if item.status.value not in {"wishlist", "applying"}
        ]
        if not submitted:
            return 0
        responses = [
            item
            for item in submitted
            if item.status.value in {"oa", "interview", "final_round", "offer", "rejected"}
        ]
        return round((len(responses) / len(submitted)) * 100)

    def _activity(
        self,
        applications: list[Application],
        resumes: list[ResumeVersion],
        coding_problems: list[CodingProblem],
        behavioral_questions: list[BehavioralQuestion],
        system_design_prompts: list[SystemDesignPrompt],
    ) -> list[dict[str, str]]:
        items: list[tuple[datetime, dict[str, str]]] = []
        for application in applications:
            items.append((application.updated_at, {
                "type": "application",
                "label": f"{application.company} - {application.role}",
                "timestamp": application.updated_at.isoformat(),
            }))
        for resume in resumes:
            items.append((resume.updated_at, {
                "type": "resume",
                "label": resume.name,
                "timestamp": resume.updated_at.isoformat(),
            }))
        for item in [*coding_problems, *behavioral_questions, *system_design_prompts]:
            title = getattr(item, "title", None) or getattr(item, "question", "Prep item")
            items.append((item.updated_at, {
                "type": "prep",
                "label": str(title),
                "timestamp": item.updated_at.isoformat(),
            }))
        return [item for _timestamp, item in sorted(items, key=lambda value: value[0], reverse=True)[:8]]
