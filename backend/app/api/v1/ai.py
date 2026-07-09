from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.services.ai_resume_analysis import ai_status


router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status", response_model=DataResponse[dict[str, object]])
def get_ai_status(
    _: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[dict[str, object]]:
    return DataResponse(data=ai_status(settings))
