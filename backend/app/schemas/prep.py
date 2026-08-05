from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

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
    competency_tags: list[str] = Field(default_factory=list, max_length=16)


class BehavioralQuestionUpdate(ORMModel):
    question: NonEmptyStr | None = Field(default=None, max_length=2_000)
    category: NonEmptyStr | None = Field(default=None, max_length=120)
    star_situation: str | None = Field(default=None, max_length=20_000)
    star_task: str | None = Field(default=None, max_length=20_000)
    star_action: str | None = Field(default=None, max_length=20_000)
    star_result: str | None = Field(default=None, max_length=20_000)
    confidence_score: int | None = Field(default=None, ge=1, le=5)
    status: PrepStatus | None = None
    competency_tags: list[str] | None = Field(default=None, max_length=16)


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
    competency_tags: list[str] = Field(default_factory=list)
    star_completeness_json: dict[str, object] = Field(default_factory=dict)
    latest_evaluation_json: dict[str, object] = Field(default_factory=dict)
    latest_evaluated_at: datetime | None = None
    evaluation_schema_version: str = "behavioral-evaluation-v1"
    trend_summary_json: dict[str, object] = Field(default_factory=dict)
    observation_summary_json: dict[str, object] = Field(default_factory=dict)
    readiness_status: str = "draft"
    career_context_version: str | None = None
    created_at: datetime
    updated_at: datetime


class StrictBehavioralModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BehavioralScoreSet(StrictBehavioralModel):
    situation: int = Field(ge=1, le=5)
    task: int = Field(ge=1, le=5)
    action: int = Field(ge=1, le=5)
    result: int = Field(ge=1, le=5)
    reflection: int = Field(ge=1, le=5)


class BehavioralQualityScores(StrictBehavioralModel):
    clarity: int = Field(ge=1, le=5)
    specificity: int = Field(ge=1, le=5)
    ownership: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    conciseness: int = Field(ge=1, le=5)
    authenticity: int = Field(ge=1, le=5)


class BehavioralEvaluationResult(StrictBehavioralModel):
    competencies: list[str] = Field(default_factory=list, max_length=16)
    star_scores: BehavioralScoreSet
    quality_scores: BehavioralQualityScores
    strengths: list[str] = Field(default_factory=list, max_length=12)
    weaknesses: list[str] = Field(default_factory=list, max_length=12)
    missing_elements: list[str] = Field(default_factory=list, max_length=12)
    recommended_revision: list[str] = Field(default_factory=list, max_length=12)
    observation_candidates: list[dict[str, object]] = Field(default_factory=list, max_length=12)


class BehavioralEvaluationCreate(ORMModel):
    competency_focus: str | None = Field(default=None, max_length=80)
    application_id: UUID | None = None


class BehavioralPracticeCreate(ORMModel):
    story_id: UUID | None = None
    application_id: UUID | None = None
    competency: str = Field(min_length=1, max_length=80)
    prompt: str = Field(min_length=5, max_length=2_000)
    answer: str = Field(min_length=20, max_length=40_000)


class BehavioralEvaluationResponse(ORMModel):
    id: UUID
    story_id: UUID
    application_id: UUID | None
    competency_focus: str | None
    evaluation_json: dict[str, object]
    comparison_json: dict[str, object]
    observation_summary_json: dict[str, object]
    career_context_version: str
    schema_version: str
    provider: str
    model: str
    status: str
    created_at: datetime


class BehavioralEvaluationEnvelope(BaseModel):
    evaluation: BehavioralEvaluationResponse
    story: BehavioralQuestionResponse


class BehavioralPracticeResponse(ORMModel):
    id: UUID
    story_id: UUID | None
    application_id: UUID | None
    competency: str
    prompt: str
    evaluation_json: dict[str, object]
    status: str
    completed_at: datetime | None
    created_at: datetime


class BehavioralPortfolioResponse(BaseModel):
    total_stories: int
    evaluated_stories: int
    interview_ready_stories: int
    competencies_covered: list[str]
    missing_competencies: list[str]
    overused_story_ids: list[UUID]
    stories_needing_work: list[UUID]
    strongest_story_id: UUID | None
    weakest_story_id: UUID | None
    top_next_action: str
    data_sufficiency: Literal["insufficient", "partial", "sufficient"]


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
