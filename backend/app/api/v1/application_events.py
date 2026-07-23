from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.application_event import ApplicationEventCreate, ApplicationEventResponse, ApplicationEventUpdate, UpcomingEventResponse
from app.schemas.common import DataResponse
from app.services.application_events import ApplicationEventService
from app.services.applications import ApplicationService
from app.services.calendar import CalendarService


router = APIRouter(tags=["application-events"])


@router.get("/applications/{application_id}/events", response_model=DataResponse[list[ApplicationEventResponse]])
def list_events(application_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[list[ApplicationEventResponse]]:
    return DataResponse(data=ApplicationEventService(db).list(user.id, application_id))


@router.post("/applications/{application_id}/events", response_model=DataResponse[ApplicationEventResponse], status_code=201)
def create_event(application_id: UUID, payload: ApplicationEventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationEventResponse]:
    return DataResponse(data=ApplicationEventService(db).create(user.id, application_id, payload))


@router.patch("/application-events/{event_id}", response_model=DataResponse[ApplicationEventResponse])
def update_event(event_id: UUID, payload: ApplicationEventUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationEventResponse]:
    return DataResponse(data=ApplicationEventService(db).update(user.id, event_id, payload))


@router.delete("/application-events/{event_id}", status_code=204)
def delete_event(event_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    ApplicationEventService(db).delete(user.id, event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/application-events/{event_id}/calendar", response_model=DataResponse[ApplicationEventResponse])
def sync_event_to_calendar(event_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), settings: Settings = Depends(get_settings)) -> DataResponse[ApplicationEventResponse]:
    event = ApplicationEventService(db).get(user.id, event_id)
    application = ApplicationService(db).get(user.id, event.application_id)
    return DataResponse(data=CalendarService(db, settings).sync_event(user.id, event, application))


@router.get("/dashboard/upcoming-events", response_model=DataResponse[list[UpcomingEventResponse]])
def upcoming_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[list[UpcomingEventResponse]]:
    return DataResponse(data=ApplicationEventService(db).upcoming(user.id))
