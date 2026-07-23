from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.application_copilot import (
    ApplicationCopilotConversationResponse,
    ApplicationCopilotRequest,
    ApplicationCopilotSendResponse,
)
from app.schemas.common import DataResponse
from app.services.application_copilot import ApplicationCopilotService


router = APIRouter(prefix="/applications", tags=["application-copilot"])


@router.get(
    "/{application_id}/copilot",
    response_model=DataResponse[ApplicationCopilotConversationResponse],
)
def get_application_copilot(
    application_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[ApplicationCopilotConversationResponse]:
    return DataResponse(
        data=ApplicationCopilotService(db, settings).history(
            user.id, application_id, limit=limit
        )
    )


@router.post(
    "/{application_id}/copilot",
    response_model=ApplicationCopilotSendResponse,
)
def send_application_copilot_message(
    application_id: UUID,
    payload: ApplicationCopilotRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ApplicationCopilotSendResponse:
    return ApplicationCopilotService(db, settings).send(
        user.id, application_id, payload
    )


@router.delete(
    "/{application_id}/copilot/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_application_copilot(
    application_id: UUID,
    conversation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    ApplicationCopilotService(db, settings).clear(
        user.id, application_id, conversation_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
