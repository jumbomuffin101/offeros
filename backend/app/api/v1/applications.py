from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import Settings, get_settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.resume import ResumeAnalysis
from app.schemas.application import (
    ApplicationAnalyzeResumeRequest,
    ApplicationAnalyzeResumeResponse,
    ApplicationCaptureRequest,
    ApplicationCaptureResponse,
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.schemas.resume_analysis import ResumeAnalysisResponse
from app.schemas.common import DataResponse
from app.schemas.application_prep import ApplicationPrepCoverageResponse
from app.services.application_prep import ApplicationPrepService
from app.services.applications import ApplicationService
from app.services.application_capture import ApplicationCaptureService
from app.services.usage import AIUsageService
from app.services.notifications import NotificationService
from app.schemas.launch import NotificationCreate


router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/capture", response_model=ApplicationCaptureResponse)
def capture_application(payload: ApplicationCaptureRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ApplicationCaptureResponse:
    result = ApplicationCaptureService(db).capture(user.id, payload)
    NotificationService(db).create(
        user.id,
        NotificationCreate(
            type="extension_capture_succeeded",
            title="Job captured",
            message=f"{result.application.company} - {result.application.role} was added to OfferOS.",
            application_id=result.application.id,
            action_url=f"/applications?open={result.application.id}",
            action_label="Open application",
            dedupe_key=f"extension-capture:{result.application.id}",
        ),
    )
    return result


@router.get("/{application_id}/prep-plan", response_model=DataResponse[ApplicationPrepCoverageResponse | None])
def get_prep_plan(application_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationPrepCoverageResponse | None]:
    return DataResponse(data=ApplicationPrepService(db).get(user.id, application_id))


@router.post("/{application_id}/prep-plan/generate", response_model=DataResponse[ApplicationPrepCoverageResponse])
def generate_prep_plan(application_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[ApplicationPrepCoverageResponse]:
    result = ApplicationPrepService(db).generate(user.id, application_id)
    NotificationService(db).create(
        user.id,
        NotificationCreate(
            type="prep_plan_ready",
            title="Prep plan ready",
            message="Your application-specific interview prep plan is ready.",
            application_id=application_id,
            action_url=f"/applications?open={application_id}&action=prep",
            action_label="Open prep plan",
            dedupe_key=f"prep-plan:{application_id}:{result.plan.updated_at.isoformat()}",
        ),
    )
    return DataResponse(data=result)


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
    duplicate = payload.analysis_request_id and db.scalar(
        select(ResumeAnalysis.id).where(
            ResumeAnalysis.user_id == user.id,
            ResumeAnalysis.analysis_request_id == payload.analysis_request_id,
        )
    )
    if duplicate:
        application, analysis = service.analyze_resume(user.id, application_id, payload.analysis_request_id)
    else:
        with AIUsageService(db, settings).track(
            user.id,
            "application_analysis",
            provider=settings.ai_provider,
            model=settings.ai_model,
            resource_id=application_id,
        ):
            application, analysis = service.analyze_resume(user.id, application_id, payload.analysis_request_id)
    NotificationService(db).create(
        user.id,
        NotificationCreate(
            type="analysis_completed",
            title="Application fit analysis completed",
            message=f"{application.company} - {application.role} is ready to review.",
            application_id=application.id,
            action_url=f"/applications?open={application.id}&action=analysis",
            action_label="Review fit",
            dedupe_key=f"application-analysis:{analysis.id}:completed",
        ),
    )
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
