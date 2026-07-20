from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.models.application import Application
from app.models.application_prep import ApplicationPrepPlan
from app.models.coding import CodingActivity
from app.models.prep import BehavioralQuestion, SystemDesignPrompt
from app.models.resume import ResumeAnalysis
from app.schemas.application_prep import ApplicationPrepCoverageResponse, ApplicationPrepPlanResponse


TOPIC_KEYWORDS = {"graphs": "Graphs", "tree": "Trees", "heap": "Heaps", "cache": "Caching", "database": "Databases", "distributed": "Distributed systems", "algorithm": "Algorithms", "data structure": "Data structures", "api": "APIs", "storage": "Storage systems"}


class ApplicationPrepService:
    def __init__(self, db: Session) -> None: self.db = db

    def get(self, user_id: UUID, application_id: UUID) -> ApplicationPrepCoverageResponse | None:
        plan = self.db.scalar(select(ApplicationPrepPlan).where(ApplicationPrepPlan.user_id == user_id, ApplicationPrepPlan.application_id == application_id))
        return self._coverage(user_id, plan) if plan else None

    def generate(self, user_id: UUID, application_id: UUID) -> ApplicationPrepCoverageResponse:
        application = self.db.scalar(select(Application).where(Application.id == application_id, Application.user_id == user_id, Application.deleted_at.is_(None)))
        if application is None: raise NotFoundError("Application")
        if not application.job_description.strip(): raise ValidationError("Add a job description before generating an interview prep plan.")
        analysis = self.db.scalar(select(ResumeAnalysis).where(ResumeAnalysis.id == application.resume_analysis_id, ResumeAnalysis.user_id == user_id, ResumeAnalysis.deleted_at.is_(None))) if application.resume_analysis_id else None
        text = f"{application.role} {application.job_description} {' '.join(analysis.missing_keywords or []) if analysis else ''}".lower()
        topics = [{"topic": name, "priority": "high" if key in text else "medium", "reason": "Based on this role's requirements and your current prep history."} for key, name in TOPIC_KEYWORDS.items() if key in text][:5] or [{"topic": "Data structures", "priority": "high", "reason": "Core technical interview preparation for this software engineering role."}, {"topic": "Graphs", "priority": "medium", "reason": "Build balanced algorithm coverage from your logged practice."}]
        behavioral_categories = ["Ownership", "Collaboration", "Impact", "Ambiguity"]
        coding = {"priority_topics": topics, "recommended_problem_mix": {"easy": 2, "medium": 6, "hard": 1}, "weekly_target": 8}
        behavioral = {"focus_areas": [{"category": item, "priority": "high" if item == "Ownership" else "medium", "reason": "Use a concrete STAR story relevant to this role."} for item in behavioral_categories], "recommended_story_ids": [], "missing_story_categories": behavioral_categories}
        system = {"focus_areas": [{"topic": topic["topic"], "priority": topic["priority"], "reason": topic["reason"]} for topic in topics if topic["topic"] in {"Distributed systems", "Caching", "Databases", "Storage systems"}], "recommended_prompts": []}
        plan = self.db.scalar(select(ApplicationPrepPlan).where(ApplicationPrepPlan.application_id == application.id))
        if plan is None:
            plan = ApplicationPrepPlan(user_id=user_id, application_id=application.id); self.db.add(plan)
        plan.status = "ready"; plan.coding = coding; plan.behavioral = behavioral; plan.system_design = system; plan.source_job_description = application.job_description; plan.source_resume_analysis_id = application.resume_analysis_id; plan.generated_at = datetime.now(UTC); plan.overall_preparation_summary = "Heuristic preparation guidance based on your job description, resume match, and recorded prep history."; plan.next_best_action = f"Practice {topics[0]['topic']} and record one timed problem."; self.db.commit(); self.db.refresh(plan)
        return self._coverage(user_id, plan)

    def _coverage(self, user_id: UUID, plan: ApplicationPrepPlan) -> ApplicationPrepCoverageResponse:
        activities = list(self.db.scalars(select(CodingActivity).where(CodingActivity.user_id == user_id, CodingActivity.deleted_at.is_(None))))
        behavioral = list(self.db.scalars(select(BehavioralQuestion).where(BehavioralQuestion.user_id == user_id, BehavioralQuestion.deleted_at.is_(None))))
        designs = list(self.db.scalars(select(SystemDesignPrompt).where(SystemDesignPrompt.user_id == user_id, SystemDesignPrompt.deleted_at.is_(None))))
        coding_rows = [{"topic": item.get("topic", ""), "practiced": sum(item.get("topic", "").lower() in " ".join(activity.topics or []).lower() for activity in activities), "status": "covered" if sum(item.get("topic", "").lower() in " ".join(activity.topics or []).lower() for activity in activities) >= 2 else "needs_work"} for item in plan.coding.get("priority_topics", []) if isinstance(item, dict)]
        behavioral_rows = [{"category": item.get("category", ""), "practiced": sum(item.get("category", "").lower() in f"{story.category} {story.question}".lower() for story in behavioral), "status": "covered" if sum(item.get("category", "").lower() in f"{story.category} {story.question}".lower() for story in behavioral) else "needs_work"} for item in plan.behavioral.get("focus_areas", []) if isinstance(item, dict)]
        design_rows = [{"topic": item.get("topic", ""), "practiced": sum(item.get("topic", "").lower() in f"{prompt.title} {prompt.prompt} {' '.join(prompt.concepts or [])}".lower() for prompt in designs), "status": "covered" if sum(item.get("topic", "").lower() in f"{prompt.title} {prompt.prompt} {' '.join(prompt.concepts or [])}".lower() for prompt in designs) else "needs_work"} for item in plan.system_design.get("focus_areas", []) if isinstance(item, dict)]
        score = lambda rows: round(100 * sum(row["status"] == "covered" for row in rows) / len(rows)) if rows else 50
        coding_score, behavioral_score, design_score = score(coding_rows), score(behavioral_rows), score(design_rows)
        return ApplicationPrepCoverageResponse(plan=ApplicationPrepPlanResponse.model_validate(plan), coding_readiness=coding_score, behavioral_readiness=behavioral_score, system_design_readiness=design_score, overall_readiness=round(coding_score * .5 + behavioral_score * .3 + design_score * .2), coding_coverage=coding_rows, behavioral_coverage=behavioral_rows, system_design_coverage=design_rows)
