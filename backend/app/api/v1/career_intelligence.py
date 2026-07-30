from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.career_intelligence.observations import CareerObservationService
from app.career_intelligence.schemas import (
    CareerContextPublic,
    CareerHealth,
    CareerObservationResponse,
    CareerRecommendation,
    CareerTrend,
)
from app.career_intelligence.service import CareerIntelligenceService
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse


router = APIRouter(prefix="/career-intelligence", tags=["career-intelligence"])


@router.get("/context", response_model=DataResponse[CareerContextPublic])
def get_context(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CareerContextPublic]:
    context = CareerIntelligenceService(db).context(user.id)
    return DataResponse(data=CareerContextPublic(**context.model_dump(exclude={"user_id", "recent_activity"})))


@router.get("/health", response_model=DataResponse[CareerHealth])
def get_health(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CareerHealth]:
    return DataResponse(data=CareerIntelligenceService(db).context(user.id).career_health)


@router.get("/recommendations", response_model=DataResponse[list[CareerRecommendation]])
def get_recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[list[CareerRecommendation]]:
    return DataResponse(data=CareerIntelligenceService(db).context(user.id).recommendations)


@router.get("/trends", response_model=DataResponse[dict[str, CareerTrend]])
def get_trends(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[dict[str, CareerTrend]]:
    return DataResponse(data=CareerIntelligenceService(db).context(user.id).trends)


@router.get("/observations", response_model=DataResponse[list[CareerObservationResponse]])
def get_observations(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[list[CareerObservationResponse]]:
    context = CareerIntelligenceService(db).context(user.id)
    rows = CareerObservationService(db, context.generated_at).list_observations(user.id)
    return DataResponse(data=[
        CareerObservationResponse(
            id=row.id, observation_type=row.observation_type, title=row.title, summary=row.summary,
            confidence=row.confidence, source_type=row.source_type, source_ids=row.source_ids_json or [],
            evidence=row.evidence_json or [], status=row.status, first_observed_at=row.first_observed_at,
            last_confirmed_at=row.last_confirmed_at, expires_at=row.expires_at,
        ) for row in rows
    ])
