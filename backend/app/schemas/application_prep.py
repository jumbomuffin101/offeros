from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


class ApplicationPrepPlanResponse(ORMModel):
    id: UUID
    application_id: UUID
    status: str
    coding: dict[str, object]
    behavioral: dict[str, object]
    system_design: dict[str, object]
    overall_preparation_summary: str
    next_best_action: str
    provider: str
    model: str
    generated_at: datetime
    updated_at: datetime


class ApplicationPrepCoverageResponse(ORMModel):
    plan: ApplicationPrepPlanResponse
    coding_readiness: int
    behavioral_readiness: int
    system_design_readiness: int
    overall_readiness: int
    coding_coverage: list[dict[str, object]]
    behavioral_coverage: list[dict[str, object]]
    system_design_coverage: list[dict[str, object]]
