from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import AnalyticsSummary, DataResponse
from app.services.analytics import AnalyticsService


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=DataResponse[AnalyticsSummary])
def analytics_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[AnalyticsSummary]:
    return DataResponse(data=AnalyticsService(db).summary(user.id))
