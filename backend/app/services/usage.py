from datetime import UTC, datetime
from contextlib import contextmanager
from collections.abc import Iterator
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.models.launch import AIUsageEvent
from app.schemas.launch import UsageOperationSummary, UsageSummaryResponse


OPERATIONS = (
    "resume_analysis",
    "application_analysis",
    "prep_plan",
    "mock_interview",
    "mock_interview_turn",
    "recruiter_copilot",
)


class AIUsageService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def begin(
        self,
        user_id: UUID,
        operation: str,
        *,
        provider: str,
        model: str,
        resource_id: UUID | None = None,
    ) -> AIUsageEvent:
        limit = self._limit(operation)
        used = self._used(user_id, operation)
        if used >= limit:
            resets_at = _next_month()
            raise AppError(
                "usage_limit_reached",
                f"You have reached this month's {operation.replace('_', ' ')} limit.",
                429,
                {
                    "operation": operation,
                    "limit": limit,
                    "used": used,
                    "resets_at": resets_at.isoformat(),
                },
            )
        event = AIUsageEvent(
            user_id=user_id,
            operation=operation,
            provider=provider,
            model=model,
            status="started",
            resource_id=resource_id,
            created_at=datetime.now(UTC),
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def finish(
        self,
        event: AIUsageEvent,
        *,
        success: bool,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
    ) -> None:
        event.status = "completed" if success else "failed"
        event.input_tokens = input_tokens
        event.output_tokens = output_tokens
        self.db.commit()

    @contextmanager
    def track(
        self,
        user_id: UUID,
        operation: str,
        *,
        provider: str,
        model: str,
        resource_id: UUID | None = None,
    ) -> Iterator[AIUsageEvent]:
        event = self.begin(
            user_id,
            operation,
            provider=provider,
            model=model,
            resource_id=resource_id,
        )
        try:
            yield event
        except Exception:
            self.finish(event, success=False)
            raise
        else:
            self.finish(event, success=True)

    def summary(self, user_id: UUID) -> UsageSummaryResponse:
        resets_at = _next_month()
        return UsageSummaryResponse(
            operations=[
                UsageOperationSummary(
                    operation=operation,
                    used=self._used(user_id, operation),
                    limit=self._limit(operation),
                    resets_at=resets_at,
                )
                for operation in OPERATIONS
            ]
        )

    def _used(self, user_id: UUID, operation: str) -> int:
        return int(
            self.db.scalar(
                select(func.count(AIUsageEvent.id)).where(
                    AIUsageEvent.user_id == user_id,
                    AIUsageEvent.operation == operation,
                    AIUsageEvent.status == "completed",
                    AIUsageEvent.created_at >= _month_start(),
                )
            )
            or 0
        )

    def _limit(self, operation: str) -> int:
        limits = {
            "resume_analysis": self.settings.ai_limit_resume_analyses,
            "application_analysis": self.settings.ai_limit_application_analyses,
            "prep_plan": self.settings.ai_limit_prep_plans,
            "mock_interview": self.settings.ai_limit_mock_interviews,
            "mock_interview_turn": self.settings.ai_limit_mock_interview_turns,
            "recruiter_copilot": self.settings.ai_limit_copilot_messages,
        }
        return limits.get(operation, self.settings.ai_limit_default)


def _month_start() -> datetime:
    now = datetime.now(UTC)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month() -> datetime:
    current = _month_start()
    if current.month == 12:
        return current.replace(year=current.year + 1, month=1)
    return current.replace(month=current.month + 1)
