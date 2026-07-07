from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.workspace import WorkspaceResetRequest, WorkspaceResetResponse
from app.services.workspace import WorkspaceService


router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.post("/reset", response_model=DataResponse[WorkspaceResetResponse])
def reset_workspace(
    payload: WorkspaceResetRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[WorkspaceResetResponse]:
    return DataResponse(data=WorkspaceService(db).reset(user.id, payload))
