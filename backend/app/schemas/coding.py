from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, HttpUrl, field_validator

from app.schemas.common import NonEmptyStr, ORMModel


Provider = Literal["leetcode"]
ActivityStatus = Literal["solved", "attempted", "review"]
Difficulty = Literal["easy", "medium", "hard"]


class CodingProfileConnect(ORMModel):
    provider: Provider = "leetcode"
    username: NonEmptyStr = Field(max_length=80)


class CodingProfileResponse(ORMModel):
    id: UUID
    provider: str
    username: str
    profile_url: str
    connection_status: str
    sync_status: str
    last_synced_at: datetime | None
    last_sync_error: str
    created_at: datetime
    updated_at: datetime


class CodingSyncResponse(ORMModel):
    status: str
    new_activities: int = 0
    updated_activities: int = 0
    skipped_duplicates: int = 0
    last_synced_at: datetime | None = None
    message: str = ""


class CodingActivityCreate(ORMModel):
    problem_title: NonEmptyStr = Field(max_length=300)
    problem_url: HttpUrl | None = None
    difficulty: Difficulty = "medium"
    topics: list[str] = Field(default_factory=list, max_length=30)
    status: ActivityStatus = "solved"
    solved_at: datetime | None = None
    attempted_at: datetime | None = None
    time_spent_minutes: int | None = Field(default=None, ge=1, le=1440)
    notes: str = Field(default="", max_length=20_000)

    @field_validator("topics")
    @classmethod
    def normalize_topics(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))[:30]


class CodingActivityUpdate(CodingActivityCreate):
    problem_title: NonEmptyStr | None = Field(default=None, max_length=300)
    difficulty: Difficulty | None = None
    status: ActivityStatus | None = None


class CodingActivityResponse(ORMModel):
    id: UUID
    provider: str
    external_id: str | None
    problem_title: str
    problem_slug: str | None
    problem_url: str | None
    difficulty: str
    topics: list[str]
    status: str
    solved_at: datetime | None
    attempted_at: datetime | None
    time_spent_minutes: int | None
    notes: str
    source: str
    created_at: datetime
    updated_at: datetime


class CodingActivityPage(ORMModel):
    items: list[CodingActivityResponse]
    total: int
    limit: int
    offset: int


class CodingActivityImport(ORMModel):
    rows: list[CodingActivityCreate] = Field(max_length=1000)


class CodingImportResponse(ORMModel):
    imported: int
    skipped_duplicates: int
    failed: int


class CodingGoalUpdate(ORMModel):
    target_problems: int = Field(default=5, ge=1, le=100)
    target_minutes: int = Field(default=180, ge=0, le=10_000)
    difficulty_target: Difficulty | None = None


class CodingGoalResponse(CodingGoalUpdate):
    id: UUID
    updated_at: datetime


class CodingSummaryResponse(ORMModel):
    total_solved: int
    solved_this_week: int
    practice_streak_days: int
    minutes_this_week: int
    difficulty_breakdown: dict[str, int]
    topic_breakdown: list[dict[str, int | str]]
    # Legacy aliases retained for the existing Prep client during rollout.
    completed_this_week: int
    current_streak: int
    time_spent_this_week: int
    topic_coverage: dict[str, int]
    recent_activity: list[CodingActivityResponse]
    goal: CodingGoalResponse | None = None
