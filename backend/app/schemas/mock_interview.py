from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ORMModel


InterviewType = Literal[
    "behavioral", "resume", "technical", "system_design", "mixed"
]
InterviewDifficulty = Literal["introductory", "standard", "challenging"]
InterviewStatus = Literal["created", "active", "completed", "abandoned", "failed"]


class MockInterviewCreate(BaseModel):
    application_id: UUID | None = None
    resume_version_id: UUID | None = None
    interview_type: InterviewType
    difficulty: InterviewDifficulty = "standard"
    question_count: int = Field(default=5, ge=3, le=10)
    focus_areas: list[str] = Field(default_factory=list, max_length=8)


class MockInterviewPlanRequest(MockInterviewCreate):
    pass


class FocusArea(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1, max_length=300)
    source: Literal["history", "observation", "prep", "role", "default"]


class QuestionPlan(BaseModel):
    interview_type: InterviewType
    difficulty: InterviewDifficulty
    target_dimensions: list[str] = Field(default_factory=list)
    priority_topics: list[str] = Field(default_factory=list)
    avoid_recent_repetition: list[str] = Field(default_factory=list)
    recurring_weaknesses: list[str] = Field(default_factory=list)
    validated_strengths: list[str] = Field(default_factory=list)
    application_specific_topics: list[str] = Field(default_factory=list)
    focus_areas: list[FocusArea] = Field(default_factory=list)
    question_count: int = Field(ge=3, le=10)
    max_follow_ups_per_question: int = Field(default=2, ge=0, le=2)


class MockInterviewPlanResponse(BaseModel):
    question_plan: QuestionPlan
    context_sources: list[str] = Field(default_factory=list)
    intelligence_status: Literal["ready", "partial", "unavailable"]


class MockInterviewAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=12_000)
    answer_request_id: UUID | None = None

    @field_validator("answer")
    @classmethod
    def normalize_answer(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be empty.")
        return value


class TurnScores(BaseModel):
    accuracy: int = Field(ge=1, le=5)
    relevance: int = Field(ge=1, le=5)
    clarity: int = Field(ge=1, le=5)
    depth: int = Field(ge=1, le=5)
    structure: int = Field(ge=1, le=5)
    ownership: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    reflection: int | None = Field(default=None, ge=1, le=5)
    collaboration: int | None = Field(default=None, ge=1, le=5)
    requirements: int | None = Field(default=None, ge=1, le=5)
    decomposition: int | None = Field(default=None, ge=1, le=5)
    scalability: int | None = Field(default=None, ge=1, le=5)
    reliability: int | None = Field(default=None, ge=1, le=5)
    tradeoffs: int | None = Field(default=None, ge=1, le=5)


class TurnEvaluation(BaseModel):
    scores: TurnScores
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missed_points: list[str] = Field(default_factory=list)
    follow_up_needed: bool = False
    follow_up_reason: str | None = None
    follow_up_question: str | None = None
    summary: str = ""
    observation_candidates: list["InterviewObservationCandidate"] = Field(
        default_factory=list, max_length=8
    )


class InterviewObservationCandidate(BaseModel):
    type: Literal[
        "interview_weakness", "interview_strength", "interview_improvement"
    ]
    dimension: str = Field(min_length=1, max_length=60)
    summary: str = Field(min_length=1, max_length=300)
    confidence: float = Field(ge=0, le=1)


class GeneratedQuestion(BaseModel):
    question: str = Field(min_length=4, max_length=2_000)
    question_type: InterviewType


class MockInterviewTurnResponse(ORMModel):
    id: UUID
    session_id: UUID
    turn_index: int
    speaker: Literal["interviewer", "candidate"]
    content: str
    question_type: str | None = None
    evaluation_json: dict | None = None
    created_at: datetime


class MockInterviewScorecardDraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    communication_score: int = Field(ge=0, le=100)
    technical_accuracy_score: int = Field(ge=0, le=100)
    structure_score: int = Field(ge=0, le=100)
    depth_score: int = Field(ge=0, le=100)
    relevance_score: int = Field(ge=0, le=100)
    behavioral_score: int | None = Field(default=None, ge=0, le=100)
    resume_fluency_score: int | None = Field(default=None, ge=0, le=100)
    system_design_score: int | None = Field(default=None, ge=0, le=100)
    technical_reasoning_score: int | None = Field(default=None, ge=0, le=100)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missed_points: list[str] = Field(default_factory=list)
    strongest_answer: str = ""
    weakest_answer: str = ""
    recommended_actions: list[str] = Field(default_factory=list)
    summary: str


class MockInterviewScorecardResponse(MockInterviewScorecardDraft):
    id: UUID
    session_id: UUID
    created_at: datetime
    updated_at: datetime


class MockInterviewSessionSummary(ORMModel):
    id: UUID
    application_id: UUID | None = None
    resume_version_id: UUID | None = None
    interview_type: InterviewType
    status: InterviewStatus
    difficulty: InterviewDifficulty
    title: str
    target_role: str
    company_name: str
    question_count: int
    current_question_index: int
    context_sources: list[str] = Field(default_factory=list)
    started_at: datetime
    completed_at: datetime | None = None
    provider: str
    model: str
    overall_score: int | None = None
    career_context_version: str = ""
    question_plan: QuestionPlan | None = None
    trend_delta: dict[str, object] = Field(default_factory=dict)
    observation_updates: list[dict[str, object]] = Field(default_factory=list)
    intelligence_status: Literal["ready", "partial", "unavailable"] = "unavailable"
    created_at: datetime
    updated_at: datetime


class MockInterviewSessionResponse(MockInterviewSessionSummary):
    turns: list[MockInterviewTurnResponse] = Field(default_factory=list)
    scorecard: MockInterviewScorecardResponse | None = None


class MockInterviewCreateResponse(BaseModel):
    session: MockInterviewSessionResponse
    first_turn: MockInterviewTurnResponse


class MockInterviewProgress(BaseModel):
    completed_questions: int
    total_questions: int
    follow_up_count: int


class MockInterviewAnswerResponse(BaseModel):
    session: MockInterviewSessionResponse
    evaluation: TurnEvaluation
    next_question: MockInterviewTurnResponse | None = None
    progress: MockInterviewProgress
