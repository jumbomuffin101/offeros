from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CareerRecommendation(BaseModel):
    key: str
    type: str
    title: str
    summary: str
    priority: Literal["urgent", "high", "medium", "low"]
    action_label: str
    action_route: str
    confidence: float = Field(ge=0, le=1)
    reason_codes: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    application_id: UUID | None = None
    expires_at: datetime | None = None
    created_at: datetime


class CareerHealth(BaseModel):
    status: Literal["ready", "insufficient_data"]
    overall_score: int | None = Field(default=None, ge=0, le=100)
    subscores: dict[str, int | None] = Field(default_factory=dict)
    reason_codes: list[str] = Field(default_factory=list)
    positive_drivers: list[str] = Field(default_factory=list)
    negative_drivers: list[str] = Field(default_factory=list)
    data_sufficiency: float = Field(ge=0, le=1)
    recommended_actions: list[str] = Field(default_factory=list)


class CareerTrend(BaseModel):
    direction: Literal["improving", "stable", "declining", "insufficient_data"]
    current_value: float | None = None
    comparison_value: float | None = None
    current_window: str = "last_14_days"
    comparison_window: str = "previous_14_days"
    sample_size: int = 0
    confidence: float = Field(ge=0, le=1)


class CareerObservationResponse(BaseModel):
    id: UUID
    observation_type: str
    title: str
    summary: str
    confidence: float
    source_type: str
    source_ids: list[str] = Field(default_factory=list)
    evidence: list[dict[str, object]] = Field(default_factory=list)
    status: str
    first_observed_at: datetime
    last_confirmed_at: datetime
    expires_at: datetime | None = None


class CareerContext(BaseModel):
    generated_at: datetime
    user_id: UUID
    applications: dict[str, object] = Field(default_factory=dict)
    resumes: dict[str, object] = Field(default_factory=dict)
    prep: dict[str, object] = Field(default_factory=dict)
    gmail: dict[str, object] = Field(default_factory=dict)
    goals: dict[str, int] = Field(default_factory=dict)
    recent_activity: list[dict[str, object]] = Field(default_factory=list)
    observations: list[CareerObservationResponse] = Field(default_factory=list)
    recommendations: list[CareerRecommendation] = Field(default_factory=list)
    career_health: CareerHealth
    trends: dict[str, CareerTrend] = Field(default_factory=dict)
    sections: dict[str, str] = Field(default_factory=dict)


class CareerContextPublic(BaseModel):
    generated_at: datetime
    applications: dict[str, object]
    resumes: dict[str, object]
    prep: dict[str, object]
    gmail: dict[str, object]
    goals: dict[str, int]
    observations: list[CareerObservationResponse]
    recommendations: list[CareerRecommendation]
    career_health: CareerHealth
    trends: dict[str, CareerTrend]
    sections: dict[str, str]

