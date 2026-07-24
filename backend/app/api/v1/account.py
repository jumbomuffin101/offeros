from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.launch import AccountDeleteRequest, UsageSummaryResponse
from app.services.account import AccountService
from app.services.usage import AIUsageService


router = APIRouter(prefix="/account", tags=["account"])


@router.get("/export")
def export_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return AccountService(db).export(user)


@router.get("/usage", response_model=DataResponse[UsageSummaryResponse])
def account_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[UsageSummaryResponse]:
    return DataResponse(data=AIUsageService(db, settings).summary(user.id))


@router.post("/delete", status_code=204)
def delete_account(
    payload: AccountDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    del payload
    AccountService(db).delete(user.id)
    return Response(status_code=204)
