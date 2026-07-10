from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.workspace_summary import WorkspaceSummaryResponse
from app.services.workspace_summary import WorkspaceSummaryService


router = APIRouter()


@router.get("/summary", response_model=DataResponse[WorkspaceSummaryResponse])
def get_analytics_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[WorkspaceSummaryResponse]:
    return DataResponse(data=WorkspaceSummaryService(db).summary(user.id))
