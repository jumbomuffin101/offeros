from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.application_event import FocusResponse
from app.schemas.common import DataResponse
from app.services.application_events import ApplicationEventService


router = APIRouter(tags=["focus"])


@router.get("/focus", response_model=DataResponse[FocusResponse | None])
def get_focus(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[FocusResponse | None]:
    return DataResponse(data=ApplicationEventService(db).focus(user.id))
