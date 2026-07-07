from typing import Literal

from pydantic import Field

from app.schemas.application import ApplicationCreate
from app.schemas.common import ORMModel
from app.schemas.prep import (
    BehavioralQuestionCreate,
    CodingProblemCreate,
    SystemDesignPromptCreate,
)
from app.schemas.resume import ResumeCreate


WorkspaceResetScope = Literal["all", "applications", "resumes", "prep"]


class WorkspaceResetRequest(ORMModel):
    scope: WorkspaceResetScope = "all"
    applications: list[ApplicationCreate] = Field(default_factory=list)
    resumes: list[ResumeCreate] = Field(default_factory=list)
    coding_problems: list[CodingProblemCreate] = Field(default_factory=list)
    behavioral_questions: list[BehavioralQuestionCreate] = Field(default_factory=list)
    system_design_prompts: list[SystemDesignPromptCreate] = Field(default_factory=list)


class WorkspaceResetResponse(ORMModel):
    scope: WorkspaceResetScope
    applications: int = 0
    resumes: int = 0
    coding_problems: int = 0
    behavioral_questions: int = 0
    system_design_prompts: int = 0
