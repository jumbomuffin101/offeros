from datetime import datetime

from pydantic import Field

from app.schemas.application import ApplicationResponse
from app.schemas.common import ORMModel
from app.schemas.prep import (
    BehavioralQuestionResponse,
    CodingProblemResponse,
    SystemDesignPromptResponse,
)
from app.schemas.resume import ResumeResponse


class WorkspaceSummaryResponse(ORMModel):
    applications: list[ApplicationResponse] = Field(default_factory=list)
    resumes: list[ResumeResponse] = Field(default_factory=list)
    coding_problems: list[CodingProblemResponse] = Field(default_factory=list)
    behavioral_questions: list[BehavioralQuestionResponse] = Field(default_factory=list)
    system_design_prompts: list[SystemDesignPromptResponse] = Field(default_factory=list)
    dashboard: dict[str, object] = Field(default_factory=dict)
    analytics: dict[str, object] = Field(default_factory=dict)
    as_of: datetime
