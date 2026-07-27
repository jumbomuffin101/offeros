from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.gmail import (
    GmailConnectResponse,
    GmailDeleteDataRequest,
    GmailDisconnectRequest,
    GmailStatusResponse,
    GmailSuggestionAcceptRequest,
    GmailSuggestionResponse,
    GmailSyncResponse,
)
from app.services.gmail import GmailService


router = APIRouter(prefix="/integrations/gmail", tags=["gmail"])


@router.get("/connect", response_model=DataResponse[GmailConnectResponse])
def connect(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[GmailConnectResponse]:
    return DataResponse(data=GmailConnectResponse(authorization_url=GmailService(db, settings).connect_url(user.id)))


@router.get("/callback")
def callback(
    state: str = Query(min_length=20),
    code: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    try:
        GmailService(db, settings).callback(state, code, error)
    except Exception:
        return RedirectResponse(f"{settings.frontend_app_url.rstrip('/')}/integrations/gmail?gmail=error", status_code=302)
    return RedirectResponse(f"{settings.frontend_app_url.rstrip('/')}/integrations/gmail?gmail=connected", status_code=302)


@router.get("/status", response_model=DataResponse[GmailStatusResponse])
def connection_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[GmailStatusResponse]:
    return DataResponse(data=GmailService(db, settings).status(user.id))


@router.post("/sync", response_model=DataResponse[GmailSyncResponse])
def sync(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[GmailSyncResponse]:
    return DataResponse(data=GmailService(db, settings).sync(user.id))


@router.get("/suggestions", response_model=DataResponse[list[GmailSuggestionResponse]])
def suggestions(
    suggestion_status: str | None = Query(default=None, alias="status"),
    application_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[list[GmailSuggestionResponse]]:
    return DataResponse(data=GmailService(db, settings).suggestions(user.id, suggestion_status, application_id))


@router.post("/suggestions/{suggestion_id}/accept", response_model=DataResponse[GmailSuggestionResponse])
def accept(
    suggestion_id: UUID,
    payload: GmailSuggestionAcceptRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[GmailSuggestionResponse]:
    return DataResponse(data=GmailService(db, settings).accept(user.id, suggestion_id, payload))


@router.post("/suggestions/{suggestion_id}/reject", response_model=DataResponse[GmailSuggestionResponse])
def reject(
    suggestion_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[GmailSuggestionResponse]:
    return DataResponse(data=GmailService(db, settings).reject(user.id, suggestion_id))


@router.post("/disconnect", status_code=204)
def disconnect(
    payload: GmailDisconnectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    GmailService(db, settings).disconnect(user.id, payload.delete_derived_data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/delete-data", status_code=204)
def delete_data(
    payload: GmailDeleteDataRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    del payload
    GmailService(db, settings).delete_derived(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
