from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdate
from app.services.settings import SettingsService


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=DataResponse[UserSettingsResponse])
def get_settings_route(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[UserSettingsResponse]:
    return DataResponse(data=SettingsService(db).get_or_create(user))


@router.patch("", response_model=DataResponse[UserSettingsResponse])
def update_settings_route(
    payload: UserSettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[UserSettingsResponse]:
    return DataResponse(data=SettingsService(db).update(user, payload))
