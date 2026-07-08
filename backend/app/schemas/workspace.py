from typing import Any, Literal

from pydantic import Field, field_validator

from app.schemas.application import ApplicationCreate
from app.schemas.common import ORMModel
from app.schemas.prep import (
    BehavioralQuestionCreate,
    CodingProblemCreate,
    SystemDesignPromptCreate,
)
from app.schemas.resume import ResumeCreate


WorkspaceResetScope = Literal["all", "applications", "resumes", "prep"]
WorkspaceResetMode = Literal["empty", "sample", "demo"]


class WorkspaceResetRequest(ORMModel):
    scope: WorkspaceResetScope = "all"
    mode: WorkspaceResetMode = "empty"
    applications: list[ApplicationCreate] = Field(default_factory=list)
    resumes: list[ResumeCreate] = Field(default_factory=list)
    coding_problems: list[CodingProblemCreate] = Field(default_factory=list)
    behavioral_questions: list[BehavioralQuestionCreate] = Field(default_factory=list)
    system_design_prompts: list[SystemDesignPromptCreate] = Field(default_factory=list)

    @field_validator("mode", mode="before")
    @classmethod
    def normalize_mode(cls, value: Any) -> Any:
        return "sample" if value == "demo" else value


class WorkspaceResetResponse(ORMModel):
    scope: WorkspaceResetScope
    mode: Literal["empty", "sample"]
    deleted: dict[str, int] = Field(default_factory=dict)
    created: dict[str, int] = Field(default_factory=dict)
