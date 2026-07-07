from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.resume_analysis import ResumeAnalysisResponse
from app.services.resume_analysis import ResumeAnalysisService


router = APIRouter(prefix="/resume-analyses", tags=["resume-analyses"])


@router.get("/{analysis_id}", response_model=DataResponse[ResumeAnalysisResponse])
def get_resume_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[ResumeAnalysisResponse]:
    return DataResponse(data=ResumeAnalysisService(db, settings).get(user.id, analysis_id))


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    ResumeAnalysisService(db, settings).delete(user.id, analysis_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
