from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.models.mock_interview import (
    MockInterviewScorecard,
    MockInterviewSession,
    MockInterviewTurn,
)
from app.schemas.mock_interview import (
    MockInterviewAnswerRequest,
    MockInterviewAnswerResponse,
    MockInterviewCreate,
    MockInterviewCreateResponse,
    MockInterviewProgress,
    MockInterviewPlanRequest,
    MockInterviewPlanResponse,
    MockInterviewScorecardResponse,
    MockInterviewSessionResponse,
    MockInterviewSessionSummary,
    MockInterviewTurnResponse,
    TurnEvaluation,
)
from app.career_intelligence.service import CareerIntelligenceService
from app.services.mock_interview_intelligence import (
    aggregate_completion,
    build_question_plan,
)
from app.services.mock_interview_ai import (
    MockInterviewProvider,
    mock_interview_provider_from_settings,
)
from app.services.mock_interview_context import MockInterviewContextService


MAX_FOLLOW_UPS = 2
logger = logging.getLogger(__name__)


class MockInterviewService:
    def __init__(
        self,
        db: Session,
        settings: Settings,
        provider: MockInterviewProvider | None = None,
    ) -> None:
        self.db = db
        self.settings = settings
        self.provider = provider
        self.context_service = MockInterviewContextService(db)

    def list(self, user_id: UUID) -> list[MockInterviewSessionSummary]:
        sessions = list(
            self.db.scalars(
                select(MockInterviewSession)
                .where(MockInterviewSession.user_id == user_id)
                .order_by(MockInterviewSession.updated_at.desc())
                .limit(30)
            )
        )
        return [
            self._summary(session)
            for session in sessions
        ]

    def get(
        self, user_id: UUID, session_id: UUID
    ) -> MockInterviewSessionResponse:
        return self._response(self._session(user_id, session_id))

    def plan(
        self, user_id: UUID, payload: MockInterviewPlanRequest
    ) -> MockInterviewPlanResponse:
        context, sources, _, _ = self.context_service.build(
            user_id, payload.application_id, payload.resume_version_id
        )
        question_plan = build_question_plan(context, payload)
        return MockInterviewPlanResponse(
            question_plan=question_plan,
            context_sources=sources,
            intelligence_status=context.get("intelligence_status", "unavailable"),
        )

    def create(
        self, user_id: UUID, payload: MockInterviewCreate
    ) -> MockInterviewCreateResponse:
        context, sources, application, resume = self.context_service.build(
            user_id, payload.application_id, payload.resume_version_id
        )
        question_plan = build_question_plan(context, payload)
        provider_context = {
            **context,
            "question_plan": question_plan.model_dump(mode="json"),
        }
        provider = self.provider or mock_interview_provider_from_settings(
            self.settings
        )
        target_role = (
            application.role
            if application is not None
            else resume.target_role
            if resume is not None
            else "Software Engineer"
        )
        company_name = application.company if application is not None else ""
        title = (
            f"{company_name} {target_role} practice".strip()
            if company_name
            else f"{target_role} practice"
        )
        question_started = time.perf_counter()
        question = provider.question(
            provider_context,
            payload.interview_type,
            payload.difficulty,
            0,
            [],
        )
        logger.debug(
            "mock_interview.question_generated duration_ms=%d stage=initial",
            round((time.perf_counter() - question_started) * 1000),
        )
        question = self._avoid_duplicate_question(question, provider_context, [])
        now = datetime.now(UTC)
        session = MockInterviewSession(
            user_id=user_id,
            application_id=application.id if application is not None else None,
            resume_version_id=resume.id if resume is not None else None,
            interview_type=payload.interview_type,
            status="active",
            difficulty=payload.difficulty,
            title=title,
            target_role=target_role,
            company_name=company_name,
            question_count=payload.question_count,
            current_question_index=0,
            current_follow_up_count=0,
            context_sources=sources,
            started_at=now,
            provider=provider.provider,
            model=provider.model,
            career_context_version=str(context.get("version", "")),
            career_context_json=context,
            question_plan_json=question_plan.model_dump(mode="json"),
            intelligence_status=str(
                context.get("intelligence_status", "unavailable")
            ),
        )
        first_turn = MockInterviewTurn(
            session=session,
            turn_index=0,
            speaker="interviewer",
            content=question.question,
            question_type=question.question_type,
            created_at=now,
        )
        self.db.add_all([session, first_turn])
        self.db.commit()
        return MockInterviewCreateResponse(
            session=self.get(user_id, session.id),
            first_turn=MockInterviewTurnResponse.model_validate(first_turn),
        )

    def answer(
        self,
        user_id: UUID,
        session_id: UUID,
        payload: MockInterviewAnswerRequest,
    ) -> MockInterviewAnswerResponse:
        session = self._session(user_id, session_id)
        if session.status != "active":
            raise ValidationError("This mock interview is not active.")
        answer_request_id = payload.answer_request_id or uuid4()
        duplicate = next(
            (
                turn
                for turn in session.turns
                if turn.answer_request_id == answer_request_id
            ),
            None,
        )
        if duplicate is not None:
            return self._existing_answer_response(session, duplicate)
        current_question = next(
            (
                turn
                for turn in reversed(session.turns)
                if turn.speaker == "interviewer"
            ),
            None,
        )
        if current_question is None:
            raise ValidationError("The current interview question is unavailable.")
        if session.turns[-1].speaker == "candidate":
            raise ValidationError("Your previous answer is still being processed.")

        context = session.career_context_json or {}
        if not context:
            context, sources, _, _ = self.context_service.build(
                user_id, session.application_id, session.resume_version_id
            )
            plan = build_question_plan(
                context,
                MockInterviewCreate(
                    application_id=session.application_id,
                    resume_version_id=session.resume_version_id,
                    interview_type=session.interview_type,
                    difficulty=session.difficulty,
                    question_count=session.question_count,
                ),
            )
            session.career_context_version = str(context.get("version", ""))
            session.career_context_json = context
            session.question_plan_json = plan.model_dump(mode="json")
            session.context_sources = sources
            session.intelligence_status = str(
                context.get("intelligence_status", "partial")
            )
        provider_context = {
            **context,
            "question_plan": session.question_plan_json or {},
        }
        provider = self.provider or mock_interview_provider_from_settings(
            self.settings
        )
        evaluation_started = time.perf_counter()
        evaluation = provider.evaluate(
            provider_context,
            current_question.content,
            payload.answer,
            current_question.question_type or session.interview_type,
            session.current_follow_up_count,
        )
        logger.debug(
            "mock_interview.answer_evaluated duration_ms=%d follow_up_count=%d",
            round((time.perf_counter() - evaluation_started) * 1000),
            session.current_follow_up_count,
        )
        now = datetime.now(UTC)
        answer_turn = MockInterviewTurn(
            session_id=session.id,
            turn_index=len(session.turns),
            speaker="candidate",
            content=payload.answer,
            question_type=current_question.question_type,
            evaluation_json=evaluation.model_dump(),
            answer_request_id=answer_request_id,
            created_at=now,
        )
        self.db.add(answer_turn)
        session.turns.append(answer_turn)

        next_turn: MockInterviewTurn | None = None
        should_follow_up = (
            evaluation.follow_up_needed
            and bool(evaluation.follow_up_question)
            and session.current_follow_up_count < MAX_FOLLOW_UPS
            and not any(
                turn.speaker == "interviewer"
                and turn.content.strip().casefold()
                == (evaluation.follow_up_question or "").strip().casefold()
                for turn in session.turns
            )
        )
        if should_follow_up:
            session.current_follow_up_count += 1
            next_turn = self._question_turn(
                session,
                evaluation.follow_up_question or "",
                current_question.question_type or session.interview_type,
                now,
            )
        else:
            session.current_question_index += 1
            session.current_follow_up_count = 0
            if session.current_question_index >= session.question_count:
                self._complete(session, provider, now)
            else:
                question_started = time.perf_counter()
                generated = provider.question(
                    provider_context,
                    session.interview_type,
                    session.difficulty,
                    session.current_question_index,
                    self._history(session.turns),
                )
                logger.debug(
                    "mock_interview.question_generated duration_ms=%d stage=next",
                    round((time.perf_counter() - question_started) * 1000),
                )
                generated = self._avoid_duplicate_question(
                    generated, provider_context, session.turns
                )
                next_turn = self._question_turn(
                    session,
                    generated.question,
                    generated.question_type,
                    now,
                )
        session.updated_at = now
        self.db.commit()
        if session.status == "completed":
            try:
                CareerIntelligenceService(self.db).context(user_id, refresh=True)
            except Exception:
                self.db.rollback()
        refreshed = self._session(user_id, session.id)
        return MockInterviewAnswerResponse(
            session=self._response(refreshed),
            evaluation=evaluation,
            next_question=(
                MockInterviewTurnResponse.model_validate(next_turn)
                if next_turn is not None
                else None
            ),
            progress=self._progress(refreshed),
        )

    def abandon(self, user_id: UUID, session_id: UUID) -> MockInterviewSessionResponse:
        session = self._session(user_id, session_id)
        if session.status == "active":
            session.status = "abandoned"
            session.completed_at = datetime.now(UTC)
            self.db.commit()
        return self.get(user_id, session_id)

    def _complete(
        self,
        session: MockInterviewSession,
        provider: MockInterviewProvider,
        now: datetime,
    ) -> None:
        started = time.perf_counter()
        evaluations = [
            TurnEvaluation.model_validate(turn.evaluation_json)
            for turn in session.turns
            if turn.speaker == "candidate" and turn.evaluation_json
        ]
        answers = [
            turn.content for turn in session.turns if turn.speaker == "candidate"
        ]
        draft = provider.scorecard(
            session.career_context_json or {},
            session.interview_type,
            evaluations,
            answers,
        )
        trend, observations = aggregate_completion(
            evaluations, draft, session.career_context_json or {}
        )
        scorecard = MockInterviewScorecard(
            session_id=session.id,
            **draft.model_dump(),
        )
        core_scores = [
            draft.communication_score,
            draft.technical_accuracy_score,
            draft.structure_score,
            draft.depth_score,
            draft.relevance_score,
        ]
        session.overall_score = round(sum(core_scores) / len(core_scores))
        session.status = "completed"
        session.completed_at = now
        session.trend_delta_json = trend
        session.observation_summary_json = observations
        session.scorecard = scorecard
        self.db.add(scorecard)
        logger.debug(
            "mock_interview.completion_aggregated duration_ms=%d evaluation_count=%d observation_count=%d",
            round((time.perf_counter() - started) * 1000),
            len(evaluations),
            len(observations),
        )

    def _question_turn(
        self,
        session: MockInterviewSession,
        content: str,
        question_type: str,
        now: datetime,
    ) -> MockInterviewTurn:
        turn = MockInterviewTurn(
            session_id=session.id,
            turn_index=len(session.turns),
            speaker="interviewer",
            content=content,
            question_type=question_type,
            created_at=now,
        )
        self.db.add(turn)
        session.turns.append(turn)
        return turn

    def _session(
        self, user_id: UUID, session_id: UUID
    ) -> MockInterviewSession:
        session = self.db.scalar(
            select(MockInterviewSession)
            .options(
                selectinload(MockInterviewSession.turns),
                selectinload(MockInterviewSession.scorecard),
            )
            .where(
                MockInterviewSession.id == session_id,
                MockInterviewSession.user_id == user_id,
            )
        )
        if session is None:
            raise NotFoundError("Mock interview")
        return session

    def _response(
        self, session: MockInterviewSession
    ) -> MockInterviewSessionResponse:
        summary = self._summary(session).model_dump()
        return MockInterviewSessionResponse(
            **summary,
            turns=[
                MockInterviewTurnResponse.model_validate(turn)
                for turn in session.turns
            ],
            scorecard=(
                MockInterviewScorecardResponse.model_validate(session.scorecard)
                if session.scorecard is not None
                else None
            ),
        )

    @staticmethod
    def _summary(session: MockInterviewSession) -> MockInterviewSessionSummary:
        value = MockInterviewSessionSummary.model_validate(session).model_dump()
        value["question_plan"] = session.question_plan_json or None
        value["trend_delta"] = session.trend_delta_json or {}
        value["observation_updates"] = session.observation_summary_json or []
        return MockInterviewSessionSummary.model_validate(value)

    def _existing_answer_response(
        self,
        session: MockInterviewSession,
        answer_turn: MockInterviewTurn,
    ) -> MockInterviewAnswerResponse:
        evaluation = TurnEvaluation.model_validate(answer_turn.evaluation_json)
        next_turn = next(
            (
                turn
                for turn in session.turns
                if turn.turn_index > answer_turn.turn_index
                and turn.speaker == "interviewer"
            ),
            None,
        )
        return MockInterviewAnswerResponse(
            session=self._response(session),
            evaluation=evaluation,
            next_question=(
                MockInterviewTurnResponse.model_validate(next_turn)
                if next_turn is not None
                else None
            ),
            progress=self._progress(session),
        )

    @staticmethod
    def _progress(session: MockInterviewSession) -> MockInterviewProgress:
        return MockInterviewProgress(
            completed_questions=min(
                session.current_question_index, session.question_count
            ),
            total_questions=session.question_count,
            follow_up_count=session.current_follow_up_count,
        )

    @staticmethod
    def _history(turns: list[MockInterviewTurn]) -> list[dict[str, str]]:
        return [
            {"speaker": turn.speaker, "content": turn.content[:1_500]}
            for turn in turns[-8:]
        ]

    @staticmethod
    def _avoid_duplicate_question(generated, context, turns):
        existing = {
            turn.content.strip().casefold()
            for turn in turns
            if turn.speaker == "interviewer"
        }
        plan = context.get("question_plan")
        if isinstance(plan, dict):
            existing.update(
                value.strip().casefold()
                for value in plan.get("avoid_recent_repetition", [])
                if isinstance(value, str)
            )
        if generated.question.strip().casefold() in existing:
            generated.question = (
                f"{generated.question.rstrip()} Use a different project or example than in recent practice."
            )[:2_000]
        return generated
