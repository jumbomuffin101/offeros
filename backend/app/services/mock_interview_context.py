from collections import Counter
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.application import Application
from app.models.application_prep import ApplicationPrepPlan
from app.models.base import PrepStatus
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion


class MockInterviewContextService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def build(
        self,
        user_id: UUID,
        application_id: UUID | None,
        resume_version_id: UUID | None,
    ) -> tuple[dict[str, Any], list[str], Application | None, ResumeVersion | None]:
        context: dict[str, Any] = {}
        sources: list[str] = []
        application = self._application(user_id, application_id)
        if application is not None:
            context["application"] = {
                "company": application.company,
                "role": application.role,
                "status": application.status.value,
                "job_description": application.job_description[:12_000],
            }
            sources.append("Application")
            if application.job_description.strip():
                sources.append("Job description")

        selected_resume_id = resume_version_id or (
            application.resume_version_id if application is not None else None
        )
        resume = self._resume(user_id, selected_resume_id)
        if resume is not None:
            context["resume"] = {
                "name": resume.name,
                "target_role": resume.target_role,
                "resume_text": resume.extracted_text[:12_000],
            }
            sources.append("Resume")

        analysis_id = (
            application.resume_analysis_id if application is not None else None
        )
        analysis = self._analysis(user_id, analysis_id, selected_resume_id)
        if analysis is not None:
            context["resume_analysis"] = {
                "strengths": analysis.strengths,
                "risks": analysis.risks,
                "missing_keywords": analysis.missing_keywords,
                "technical_depth_score": analysis.technical_depth_score,
                "recruiter_summary": analysis.recruiter_summary,
                "recommendations": analysis.recommendations,
            }
            sources.append("Resume analysis")

        plan = self._prep_plan(
            user_id, application.id if application is not None else None
        )
        if plan is not None:
            context["prep_plan"] = {
                "coding": plan.coding,
                "behavioral": plan.behavioral,
                "system_design": plan.system_design,
                "summary": plan.overall_preparation_summary,
                "next_best_action": plan.next_best_action,
            }
            sources.append("Application prep plan")

        prep_history = self._prep_history(user_id)
        if any(prep_history.values()):
            context["prep_history"] = prep_history
            sources.append("Prep history")
        return context, sources, application, resume

    def _application(
        self, user_id: UUID, application_id: UUID | None
    ) -> Application | None:
        if application_id is None:
            return None
        application = self.db.scalar(
            select(Application).where(
                Application.id == application_id,
                Application.user_id == user_id,
                Application.deleted_at.is_(None),
            )
        )
        if application is None:
            raise NotFoundError("Application")
        return application

    def _resume(
        self, user_id: UUID, resume_id: UUID | None
    ) -> ResumeVersion | None:
        if resume_id is None:
            return None
        resume = self.db.scalar(
            select(ResumeVersion).where(
                ResumeVersion.id == resume_id,
                ResumeVersion.user_id == user_id,
                ResumeVersion.deleted_at.is_(None),
            )
        )
        if resume is None:
            raise NotFoundError("Resume")
        return resume

    def _analysis(
        self,
        user_id: UUID,
        analysis_id: UUID | None,
        resume_id: UUID | None,
    ) -> ResumeAnalysis | None:
        statement = select(ResumeAnalysis).where(
            ResumeAnalysis.user_id == user_id,
            ResumeAnalysis.deleted_at.is_(None),
            ResumeAnalysis.status == "completed",
        )
        if analysis_id is not None:
            statement = statement.where(ResumeAnalysis.id == analysis_id)
        elif resume_id is not None:
            statement = (
                statement.where(ResumeAnalysis.resume_version_id == resume_id)
                .order_by(ResumeAnalysis.created_at.desc())
                .limit(1)
            )
        else:
            return None
        return self.db.scalar(statement)

    def _prep_plan(
        self, user_id: UUID, application_id: UUID | None
    ) -> ApplicationPrepPlan | None:
        if application_id is None:
            return None
        return self.db.scalar(
            select(ApplicationPrepPlan).where(
                ApplicationPrepPlan.user_id == user_id,
                ApplicationPrepPlan.application_id == application_id,
            )
        )

    def _prep_history(self, user_id: UUID) -> dict[str, Any]:
        coding = list(
            self.db.scalars(
                select(CodingProblem).where(
                    CodingProblem.user_id == user_id,
                    CodingProblem.deleted_at.is_(None),
                    CodingProblem.status == PrepStatus.COMPLETED,
                )
            )
        )
        behavioral = list(
            self.db.scalars(
                select(BehavioralQuestion).where(
                    BehavioralQuestion.user_id == user_id,
                    BehavioralQuestion.deleted_at.is_(None),
                    BehavioralQuestion.status == PrepStatus.COMPLETED,
                )
            )
        )
        design = list(
            self.db.scalars(
                select(SystemDesignPrompt).where(
                    SystemDesignPrompt.user_id == user_id,
                    SystemDesignPrompt.deleted_at.is_(None),
                    SystemDesignPrompt.status == PrepStatus.COMPLETED,
                )
            )
        )
        return {
            "coding_topics": [
                value
                for value, _ in Counter(item.topic for item in coding).most_common(8)
            ],
            "behavioral_categories": [
                value
                for value, _ in Counter(
                    item.category for item in behavioral
                ).most_common(8)
            ],
            "system_design_prompts": [item.title for item in design[:8]],
        }
