from __future__ import annotations

import logging
import time
from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.career_intelligence.service import CareerIntelligenceService
from app.core.errors import NotFoundError
from app.models.application import Application
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.mock_interview import MockInterviewSession
from app.models.resume import ResumeVersion


logger = logging.getLogger(__name__)
CONTEXT_VERSION = "mock-interview-context-v1"
INTERVIEW_EVENT_TYPES = {
    "recruiter_screen",
    "technical_interview",
    "behavioral_interview",
    "system_design",
    "final_round",
}


class MockInterviewContextService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def build(
        self,
        user_id: UUID,
        application_id: UUID | None,
        resume_version_id: UUID | None,
    ) -> tuple[dict[str, Any], list[str], Application | None, ResumeVersion | None]:
        started = time.perf_counter()
        application = self._application(user_id, application_id)
        selected_resume_id = resume_version_id or (
            application.resume_version_id if application is not None else None
        )
        resume = self._resume(user_id, selected_resume_id)
        sources: list[str] = []
        status = "ready"
        try:
            career = CareerIntelligenceService(self.db).context(user_id)
            sources.append("Career intelligence")
        except Exception:
            self.db.rollback()
            career = None
            status = "partial"
            logger.warning(
                "mock_interview.career_context_unavailable user_id=%s", user_id
            )

        recent = self._recent_sessions(user_id)
        dimensions = self._dimension_history(recent)
        recurring_low = [
            key
            for key, values in sorted(dimensions.items())
            if len(values) >= 2 and sum(values) / len(values) < 70
        ]
        validated_strengths = [
            key
            for key, values in sorted(dimensions.items())
            if len(values) >= 2 and sum(values[:3]) / min(3, len(values)) >= 80
        ]
        question_categories = [
            turn.question_type
            for session in recent[:5]
            for turn in session.turns
            if turn.speaker == "interviewer" and turn.question_type
        ]
        recent_prompts = [
            turn.content[:300]
            for session in recent[:5]
            for turn in session.turns
            if turn.speaker == "interviewer"
        ][:10]

        active_observations = []
        career_prep: dict[str, object] = {}
        interview_readiness = None
        behavioral_readiness = None
        system_design_readiness = None
        technical_readiness = None
        if career is not None:
            active_observations = [
                {
                    "type": row.observation_type,
                    "dimension": _observation_dimension(row.observation_type, row.summary),
                    "summary": row.summary[:300],
                    "confidence": row.confidence,
                }
                for row in career.observations
                if row.status == "active"
                and row.observation_type
                in {
                    "interview_weakness",
                    "interview_strength",
                    "interview_improvement",
                    "resume_weakness",
                }
            ][:8]
            career_prep = career.prep
            subscores = career.career_health.subscores
            interview_readiness = subscores.get("interview_readiness")
            behavioral_readiness = subscores.get("behavioral_readiness")
            system_design_readiness = subscores.get("system_design_readiness")
            technical_readiness = subscores.get("coding_consistency")

        prep_plan = self._prep_plan(
            user_id, application.id if application is not None else None
        )
        prep_priorities = _prep_priorities(prep_plan)
        application_topics = _application_topics(application, resume, prep_plan)
        context = {
            "version": CONTEXT_VERSION,
            "intelligence_status": status,
            "target_application": _application_summary(application),
            "selected_resume": _resume_summary(resume),
            "active_observations": active_observations,
            "recent_interviews": [_session_summary(row) for row in recent[:6]],
            "recent_question_categories": [
                value for value, _ in Counter(question_categories).most_common(6)
            ],
            "recent_question_prompts": recent_prompts,
            "recurring_low_scoring_dimensions": recurring_low[:6],
            "validated_strengths": validated_strengths[:6],
            "coding_consistency": _readiness_label(technical_readiness),
            "behavioral_readiness": behavioral_readiness,
            "system_design_readiness": system_design_readiness,
            "technical_readiness": technical_readiness,
            "prep_priorities": prep_priorities[:6],
            "application_specific_topics": application_topics[:6],
            "upcoming_interview_at": self._upcoming_interview(
                user_id, application.id if application is not None else None
            ),
            "career_health_interview_readiness": interview_readiness,
            "prep_activity": {
                "coding_completed": _nested_int(career_prep, "coding", "completed"),
                "behavioral_completed": _nested_int(
                    career_prep, "behavioral", "completed"
                ),
                "system_design_completed": _nested_int(
                    career_prep, "system_design", "completed"
                ),
            },
        }
        if application is not None:
            sources.append("Target application")
        if resume is not None:
            sources.append("Resume summary")
        if prep_plan is not None:
            sources.append("Application prep plan")
        if recent:
            sources.append("Recent mock interviews")
        sources = list(dict.fromkeys(sources))
        logger.debug(
            "mock_interview.context_built duration_ms=%d status=%s source_count=%d recent_session_count=%d",
            round((time.perf_counter() - started) * 1000),
            status,
            len(sources),
            len(recent),
        )
        return context, sources, application, resume

    def _recent_sessions(self, user_id: UUID) -> list[MockInterviewSession]:
        return list(
            self.db.scalars(
                select(MockInterviewSession)
                .options(
                    selectinload(MockInterviewSession.scorecard),
                    selectinload(MockInterviewSession.turns),
                )
                .where(
                    MockInterviewSession.user_id == user_id,
                    MockInterviewSession.status == "completed",
                )
                .order_by(MockInterviewSession.completed_at.desc())
                .limit(8)
            )
        )

    @staticmethod
    def _dimension_history(
        sessions: list[MockInterviewSession],
    ) -> dict[str, list[int]]:
        result: dict[str, list[int]] = {}
        for session in sessions:
            card = session.scorecard
            if card is None:
                continue
            values = {
                "clarity": card.communication_score,
                "accuracy": card.technical_accuracy_score,
                "structure": card.structure_score,
                "depth": card.depth_score,
                "relevance": card.relevance_score,
                "behavioral": card.behavioral_score,
                "resume_fluency": card.resume_fluency_score,
                "system_design": card.system_design_score,
                "technical_reasoning": card.technical_reasoning_score,
            }
            for key, value in values.items():
                if value is not None:
                    result.setdefault(key, []).append(value)
        return result

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

    def _upcoming_interview(
        self, user_id: UUID, application_id: UUID | None
    ) -> str | None:
        if application_id is None:
            return None
        event = self.db.scalar(
            select(ApplicationEvent)
            .where(
                ApplicationEvent.user_id == user_id,
                ApplicationEvent.application_id == application_id,
                ApplicationEvent.deleted_at.is_(None),
                ApplicationEvent.status == "upcoming",
                ApplicationEvent.event_type.in_(INTERVIEW_EVENT_TYPES),
                ApplicationEvent.scheduled_at >= datetime.now(UTC),
            )
            .order_by(ApplicationEvent.scheduled_at.asc())
            .limit(1)
        )
        return event.scheduled_at.isoformat() if event else None


def _application_summary(application: Application | None) -> dict[str, object] | None:
    if application is None:
        return None
    return {
        "company": application.company[:200],
        "role": application.role[:200],
        "status": application.status.value,
        "priority": application.priority.value,
        "deadline": application.deadline.isoformat() if application.deadline else None,
        "tags": application.tags[:8],
    }


def _resume_summary(resume: ResumeVersion | None) -> dict[str, object] | None:
    if resume is None:
        return None
    return {
        "name": resume.name[:200],
        "target_role": resume.target_role[:200],
        "latest_overall_score": resume.latest_overall_score,
        "strengths": resume.strengths[:6],
        "weaknesses": resume.weaknesses[:6],
        "missing_keywords": resume.missing_keywords[:8],
    }


def _session_summary(session: MockInterviewSession) -> dict[str, object]:
    card = session.scorecard
    return {
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "overall_score": session.overall_score,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "strongest_dimension": (
            session.trend_delta_json or {}
        ).get("strongest_dimension"),
        "weakest_dimension": (
            session.trend_delta_json or {}
        ).get("weakest_dimension"),
        "strengths": card.strengths[:4] if card else [],
        "weaknesses": card.weaknesses[:4] if card else [],
    }


def _prep_priorities(plan: ApplicationPrepPlan | None) -> list[str]:
    if plan is None:
        return []
    values = [plan.next_best_action, plan.overall_preparation_summary]
    for section in (plan.coding, plan.behavioral, plan.system_design):
        for key in ("focus", "priority", "next_action", "summary"):
            value = section.get(key) if isinstance(section, dict) else None
            if isinstance(value, str):
                values.append(value)
    return [value.strip()[:180] for value in values if value and value.strip()]


def _application_topics(
    application: Application | None,
    resume: ResumeVersion | None,
    plan: ApplicationPrepPlan | None,
) -> list[str]:
    values: list[str] = []
    if application is not None:
        values.extend(application.tags)
        values.append(application.role)
    if resume is not None:
        values.extend(resume.missing_keywords[:5])
    if plan is not None:
        for section_name, section in (
            ("Coding", plan.coding),
            ("Behavioral", plan.behavioral),
            ("System design", plan.system_design),
        ):
            if section:
                values.append(section_name)
    return list(dict.fromkeys(value.strip()[:120] for value in values if value.strip()))


def _observation_dimension(type_: str, summary: str) -> str:
    for dimension in (
        "structure",
        "depth",
        "clarity",
        "accuracy",
        "relevance",
        "behavioral",
        "system_design",
        "technical_reasoning",
        "resume_fluency",
    ):
        if dimension.replace("_", " ") in summary.lower():
            return dimension
    return type_.replace("interview_", "")


def _readiness_label(value: object) -> str:
    if not isinstance(value, int):
        return "insufficient_data"
    return "strong" if value >= 75 else "developing" if value >= 55 else "needs_attention"


def _nested_int(value: dict[str, object], section: str, key: str) -> int:
    nested = value.get(section)
    result = nested.get(key) if isinstance(nested, dict) else 0
    return result if isinstance(result, int) else 0
