from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.launch import NotificationListResponse, NotificationResponse
from app.services.notifications import NotificationService


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=DataResponse[NotificationListResponse])
def list_notifications(
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[NotificationListResponse]:
    return DataResponse(
        data=NotificationService(db).list(user.id, unread_only=unread_only)
    )


@router.patch(
    "/{notification_id}/read",
    response_model=DataResponse[NotificationResponse],
)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[NotificationResponse]:
    return DataResponse(
        data=NotificationService(db).mark_read(user.id, notification_id)
    )


@router.post("/read-all", response_model=DataResponse[dict[str, int]])
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[dict[str, int]]:
    return DataResponse(
        data={"updated": NotificationService(db).mark_all_read(user.id)}
    )
