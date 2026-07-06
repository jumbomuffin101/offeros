from typing import Annotated, Generic, TypeVar

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, StringConstraints


T = TypeVar("T")
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DataResponse(BaseModel, Generic[T]):
    data: T


class HealthResponse(BaseModel):
    status: str = "ok"
    environment: str
    service: str = "offeros-api"
    version: str


class AnalyticsSummary(BaseModel):
    total_applications: int = 0
    application_statuses: dict[str, int] = Field(default_factory=dict)
    total_resumes: int = 0
    completed_coding_problems: int = 0
    completed_behavioral_questions: int = 0
    completed_system_design_prompts: int = 0


def persistence_values(model: BaseModel, *, exclude_unset: bool = False) -> dict[str, object]:
    values = model.model_dump(exclude_unset=exclude_unset)
    return {key: str(value) if isinstance(value, AnyUrl) else value for key, value in values.items()}
