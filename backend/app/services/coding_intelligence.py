from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.models.coding import CodingActivity, CodingGoal, CodingProfileConnection
from app.schemas.coding import (
    CodingActivityCreate,
    CodingActivityImport,
    CodingActivityPage,
    CodingActivityResponse,
    CodingActivityUpdate,
    CodingGoalResponse,
    CodingGoalUpdate,
    CodingImportResponse,
    CodingProfileConnect,
    CodingProfileResponse,
    CodingSummaryResponse,
    CodingSyncResponse,
)
from app.schemas.common import persistence_values
from app.services.coding_profiles import provider_for


class CodingIntelligenceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def connect(self, user_id: UUID, payload: CodingProfileConnect) -> CodingProfileResponse:
        provider = provider_for(payload.provider)
        username = provider.validate_username(payload.username)
        unsupported_message = "Automatic LeetCode activity sync is unavailable. Log or import practice manually."
        connection = self._connection(user_id, payload.provider)
        if connection is None:
            connection = CodingProfileConnection(
                user_id=user_id, provider=payload.provider, username=username, profile_url=provider.profile_url(username),
                sync_status="unsupported", last_sync_error=unsupported_message,
            )
            self.db.add(connection)
        else:
            connection.username = username
            connection.profile_url = provider.profile_url(username)
            connection.connection_status = "connected"
            connection.sync_status = "unsupported"
            connection.last_sync_error = unsupported_message
        self.db.commit()
        self.db.refresh(connection)
        return CodingProfileResponse.model_validate(connection)

    def connection(self, user_id: UUID) -> CodingProfileResponse | None:
        connection = self._connection(user_id, "leetcode")
        return CodingProfileResponse.model_validate(connection) if connection else None

    def disconnect(self, user_id: UUID) -> None:
        connection = self._connection(user_id, "leetcode")
        if connection is None:
            raise NotFoundError("Coding profile connection")
        self.db.delete(connection)
        self.db.commit()

    def sync(self, user_id: UUID) -> CodingSyncResponse:
        connection = self._connection(user_id, "leetcode")
        if connection is None:
            raise ValidationError("Connect a LeetCode profile before syncing.")
        result = provider_for(connection.provider).sync(connection.username)
        connection.sync_status = result.status
        connection.last_sync_error = result.message if result.status in {"failed", "unsupported"} else ""
        if result.status == "synced":
            connection.last_synced_at = datetime.now(UTC)
        self.db.commit()
        return CodingSyncResponse(status=result.status, message=result.message, last_synced_at=connection.last_synced_at)

    def list_activities(
        self, user_id: UUID, *, limit: int, offset: int, difficulty: str | None, topic: str | None, status: str | None
    ) -> CodingActivityPage:
        statement = select(CodingActivity).where(CodingActivity.user_id == user_id, CodingActivity.deleted_at.is_(None))
        if difficulty:
            statement = statement.where(CodingActivity.difficulty == difficulty)
        if status:
            statement = statement.where(CodingActivity.status == status)
        activities = list(self.db.scalars(statement.order_by(CodingActivity.solved_at.desc(), CodingActivity.updated_at.desc())))
        if topic:
            lowered = topic.lower()
            activities = [item for item in activities if any(value.lower() == lowered for value in item.topics or [])]
        total = len(activities)
        return CodingActivityPage(items=[CodingActivityResponse.model_validate(item) for item in activities[offset:offset + limit]], total=total, limit=limit, offset=offset)

    def create_activity(self, user_id: UUID, payload: CodingActivityCreate, *, source: str = "manual") -> CodingActivityResponse:
        values = persistence_values(payload)
        values["provider"] = "manual"
        values["source"] = source
        values = self._normalize_activity_values(values)
        if self._duplicate(user_id, values):
            raise ValidationError("This coding activity is already in your history.")
        activity = CodingActivity(user_id=user_id, **values)
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return CodingActivityResponse.model_validate(activity)

    def update_activity(self, user_id: UUID, activity_id: UUID, payload: CodingActivityUpdate) -> CodingActivityResponse:
        activity = self._activity(user_id, activity_id)
        values = self._normalize_activity_values(persistence_values(payload, exclude_unset=True), existing=activity)
        for key, value in values.items():
            setattr(activity, key, value)
        self.db.commit()
        self.db.refresh(activity)
        return CodingActivityResponse.model_validate(activity)

    def delete_activity(self, user_id: UUID, activity_id: UUID) -> None:
        activity = self._activity(user_id, activity_id)
        activity.deleted_at = datetime.now(UTC)
        self.db.commit()

    def import_activities(self, user_id: UUID, payload: CodingActivityImport) -> CodingImportResponse:
        imported = skipped = failed = 0
        for row in payload.rows:
            try:
                values = self._normalize_activity_values(persistence_values(row))
                values.update({"provider": "manual", "source": "import"})
                if self._duplicate(user_id, values):
                    skipped += 1
                    continue
                self.db.add(CodingActivity(user_id=user_id, **values))
                imported += 1
            except (TypeError, ValueError, ValidationError):
                failed += 1
        self.db.commit()
        return CodingImportResponse(imported=imported, skipped_duplicates=skipped, failed=failed)

    def summary(self, user_id: UUID) -> CodingSummaryResponse:
        activities = list(self.db.scalars(select(CodingActivity).where(CodingActivity.user_id == user_id, CodingActivity.deleted_at.is_(None)).order_by(CodingActivity.solved_at.desc(), CodingActivity.updated_at.desc())))
        solved = [item for item in activities if item.status == "solved"]
        start_of_week = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=datetime.now(UTC).weekday())
        weekly = [item for item in solved if item.solved_at and item.solved_at >= start_of_week]
        breakdown = {level: sum(item.difficulty == level for item in solved) for level in ("easy", "medium", "hard")}
        topics: dict[str, int] = {}
        for item in solved:
            for topic in item.topics or []:
                topics[topic] = topics.get(topic, 0) + 1
        goal = self.db.scalar(select(CodingGoal).where(CodingGoal.user_id == user_id))
        return CodingSummaryResponse(
            total_solved=len(solved), difficulty_breakdown=breakdown, completed_this_week=len(weekly),
            current_streak=_streak(solved), time_spent_this_week=sum(item.time_spent_minutes or 0 for item in weekly),
            topic_coverage=dict(sorted(topics.items(), key=lambda item: (-item[1], item[0]))),
            recent_activity=[CodingActivityResponse.model_validate(item) for item in activities[:8]],
            goal=CodingGoalResponse.model_validate(goal) if goal else None,
        )

    def save_goal(self, user_id: UUID, payload: CodingGoalUpdate) -> CodingGoalResponse:
        goal = self.db.scalar(select(CodingGoal).where(CodingGoal.user_id == user_id))
        if goal is None:
            goal = CodingGoal(user_id=user_id, **persistence_values(payload))
            self.db.add(goal)
        else:
            for key, value in persistence_values(payload).items():
                setattr(goal, key, value)
        self.db.commit()
        self.db.refresh(goal)
        return CodingGoalResponse.model_validate(goal)

    def _connection(self, user_id: UUID, provider: str) -> CodingProfileConnection | None:
        return self.db.scalar(select(CodingProfileConnection).where(CodingProfileConnection.user_id == user_id, CodingProfileConnection.provider == provider))

    def _activity(self, user_id: UUID, activity_id: UUID) -> CodingActivity:
        activity = self.db.scalar(select(CodingActivity).where(CodingActivity.id == activity_id, CodingActivity.user_id == user_id, CodingActivity.deleted_at.is_(None)))
        if activity is None:
            raise NotFoundError("Coding activity")
        return activity

    def _duplicate(self, user_id: UUID, values: dict[str, object]) -> bool:
        title = str(values.get("problem_title", "")).strip().lower()
        solved_at = values.get("solved_at") or values.get("attempted_at")
        statement = select(CodingActivity).where(CodingActivity.user_id == user_id, CodingActivity.deleted_at.is_(None), func.lower(CodingActivity.problem_title) == title)
        for item in self.db.scalars(statement):
            if (item.solved_at or item.attempted_at) == solved_at:
                return True
        return False

    @staticmethod
    def _normalize_activity_values(values: dict[str, object], existing: CodingActivity | None = None) -> dict[str, object]:
        if values.get("status") == "solved" and "solved_at" not in values:
            values["solved_at"] = (existing.solved_at if existing else None) or datetime.now(UTC)
        if values.get("status") in {"attempted", "review"} and "attempted_at" not in values:
            values["attempted_at"] = (existing.attempted_at if existing else None) or datetime.now(UTC)
        return values


def _streak(activities: list[CodingActivity]) -> int:
    days = {item.solved_at.date() for item in activities if item.solved_at}
    if not days:
        return 0
    cursor = datetime.now(UTC).date()
    if cursor not in days:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak
