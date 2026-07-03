from datetime import datetime
from uuid import UUID

from pydantic import Field, HttpUrl

from app.models.base import Difficulty, PrepStatus
from app.schemas.common import NonEmptyStr, ORMModel


class CodingProblemCreate(ORMModel):
    title: NonEmptyStr = Field(max_length=300)
    difficulty: Difficulty = Difficulty.MEDIUM
    topic: NonEmptyStr = Field(max_length=120)
    target_time_minutes: int = Field(default=30, ge=5, le=480)
    status: PrepStatus = PrepStatus.NOT_STARTED
    notes: str = Field(default="", max_length=20_000)
    link: HttpUrl | None = None


class CodingProblemUpdate(ORMModel):
    title: NonEmptyStr | None = Field(default=None, max_length=300)
    difficulty: Difficulty | None = None
    topic: NonEmptyStr | None = Field(default=None, max_length=120)
    target_time_minutes: int | None = Field(default=None, ge=5, le=480)
    status: PrepStatus | None = None
    notes: str | None = Field(default=None, max_length=20_000)
    link: HttpUrl | None = None


class CodingProblemResponse(ORMModel):
    id: UUID
    user_id: UUID
    title: str
    difficulty: Difficulty
    topic: str
    target_time_minutes: int
    status: PrepStatus
    notes: str
    link: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class BehavioralQuestionCreate(ORMModel):
    question: NonEmptyStr = Field(max_length=2_000)
    category: NonEmptyStr = Field(max_length=120)
    star_situation: str = Field(default="", max_length=20_000)
    star_task: str = Field(default="", max_length=20_000)
    star_action: str = Field(default="", max_length=20_000)
    star_result: str = Field(default="", max_length=20_000)
    confidence_score: int = Field(default=1, ge=1, le=5)
    status: PrepStatus = PrepStatus.NOT_STARTED


class BehavioralQuestionUpdate(ORMModel):
    question: NonEmptyStr | None = Field(default=None, max_length=2_000)
    category: NonEmptyStr | None = Field(default=None, max_length=120)
    star_situation: str | None = Field(default=None, max_length=20_000)
    star_task: str | None = Field(default=None, max_length=20_000)
    star_action: str | None = Field(default=None, max_length=20_000)
    star_result: str | None = Field(default=None, max_length=20_000)
    confidence_score: int | None = Field(default=None, ge=1, le=5)
    status: PrepStatus | None = None


class BehavioralQuestionResponse(ORMModel):
    id: UUID
    user_id: UUID
    question: str
    category: str
    star_situation: str
    star_task: str
    star_action: str
    star_result: str
    confidence_score: int
    status: PrepStatus
    created_at: datetime
    updated_at: datetime


class SystemDesignPromptCreate(ORMModel):
    title: NonEmptyStr = Field(max_length=300)
    prompt: NonEmptyStr = Field(max_length=20_000)
    concepts: list[str] = Field(default_factory=list, max_length=50)
    status: PrepStatus = PrepStatus.NOT_STARTED
    notes: str = Field(default="", max_length=20_000)


class SystemDesignPromptUpdate(ORMModel):
    title: NonEmptyStr | None = Field(default=None, max_length=300)
    prompt: NonEmptyStr | None = Field(default=None, max_length=20_000)
    concepts: list[str] | None = Field(default=None, max_length=50)
    status: PrepStatus | None = None
    notes: str | None = Field(default=None, max_length=20_000)


class SystemDesignPromptResponse(ORMModel):
    id: UUID
    user_id: UUID
    title: str
    prompt: str
    concepts: list[str]
    status: PrepStatus
    notes: str
    created_at: datetime
    updated_at: datetime
