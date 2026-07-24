from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.application_attention import (
    ApplicationAttentionOverrideRequest,
    ApplicationInboxResponse,
)
from app.services.application_attention import ApplicationAttentionService


router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("", response_model=ApplicationInboxResponse)
def get_inbox(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationInboxResponse:
    return ApplicationAttentionService(db).inbox(user.id)


@router.post("/overrides", response_model=ApplicationInboxResponse)
def override_attention_item(
    payload: ApplicationAttentionOverrideRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationInboxResponse:
    return ApplicationAttentionService(db).override(user.id, payload)
