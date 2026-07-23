from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.calendar import CalendarConnectResponse, CalendarStatusResponse
from app.schemas.common import DataResponse
from app.services.calendar import CalendarService


router = APIRouter(prefix="/integrations/google-calendar", tags=["integrations"])


@router.get("/connect", response_model=DataResponse[CalendarConnectResponse])
def connect(db: Session = Depends(get_db), user: User = Depends(get_current_user), settings: Settings = Depends(get_settings)) -> DataResponse[CalendarConnectResponse]:
    return DataResponse(data=CalendarConnectResponse(authorization_url=CalendarService(db, settings).connect_url(user.id)))


@router.get("/callback", include_in_schema=True)
def callback(state: str = Query(min_length=20), code: str = Query(min_length=1), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> RedirectResponse:
    CalendarService(db, settings).callback(state, code)
    return RedirectResponse(f"{settings.frontend_app_url.rstrip('/')}/settings?calendar=connected", status_code=302)


@router.get("/status", response_model=DataResponse[CalendarStatusResponse])
def connection_status(db: Session = Depends(get_db), user: User = Depends(get_current_user), settings: Settings = Depends(get_settings)) -> DataResponse[CalendarStatusResponse]:
    return DataResponse(data=CalendarService(db, settings).status(user.id))


@router.delete("", status_code=204)
def disconnect(db: Session = Depends(get_db), user: User = Depends(get_current_user), settings: Settings = Depends(get_settings)) -> Response:
    CalendarService(db, settings).disconnect(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
