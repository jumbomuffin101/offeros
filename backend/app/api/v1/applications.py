from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import Settings, get_settings
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.application import (
    ApplicationAnalyzeResumeRequest,
    ApplicationAnalyzeResumeResponse,
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.schemas.resume_analysis import ResumeAnalysisResponse
from app.schemas.common import DataResponse
from app.schemas.application_prep import ApplicationPrepCoverageResponse
from app.services.application_prep import ApplicationPrepService
from app.services.applications import ApplicationService


router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/{application_id}/prep-plan", response_model=DataResponse[ApplicationPrepCoverageResponse | None])
def get_prep_plan(application_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationPrepCoverageResponse | None]:
    return DataResponse(data=ApplicationPrepService(db).get(user.id, application_id))


@router.post("/{application_id}/prep-plan/generate", response_model=DataResponse[ApplicationPrepCoverageResponse])
def generate_prep_plan(application_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationPrepCoverageResponse]:
    return DataResponse(data=ApplicationPrepService(db).generate(user.id, application_id))


@router.get("", response_model=DataResponse[list[ApplicationResponse]])
def list_applications(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[list[ApplicationResponse]]:
    return DataResponse(data=ApplicationService(db).list(user.id))


@router.post("", response_model=DataResponse[ApplicationResponse], status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ApplicationResponse]:
    return DataResponse(data=ApplicationService(db).create(user.id, payload))


@router.get("/{application_id}", response_model=DataResponse[ApplicationResponse])
def get_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ApplicationResponse]:
    return DataResponse(data=ApplicationService(db).get_response(user.id, application_id))


@router.patch("/{application_id}", response_model=DataResponse[ApplicationResponse])
def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ApplicationResponse]:
    return DataResponse(data=ApplicationService(db).update(user.id, application_id, payload))


@router.post("/{application_id}/analyze-resume", response_model=ApplicationAnalyzeResumeResponse)
def analyze_application_resume(
    application_id: UUID,
    payload: ApplicationAnalyzeResumeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ApplicationAnalyzeResumeResponse:
    service = ApplicationService(db, settings)
    application, analysis = service.analyze_resume(user.id, application_id, payload.analysis_request_id)
    return ApplicationAnalyzeResumeResponse(
        application=application,
        analysis=ResumeAnalysisResponse.model_validate(analysis),
    )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    ApplicationService(db).delete(user.id, application_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
