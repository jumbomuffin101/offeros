from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.resume_analysis import ResumeAnalysisCreate, ResumeAnalysisResponse, ResumeAnalyzeResponse
from app.core.config import Settings, get_settings
from app.schemas.resume import ResumeCreate, ResumeExtractionSummary, ResumeResponse, ResumeUpdate, ResumeUploadResponse
from app.services.resume_analysis import ResumeAnalysisService
from app.services.resumes import ResumeService


router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("", response_model=DataResponse[list[ResumeResponse]])
def list_resumes(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[list[ResumeResponse]]:
    return DataResponse(data=ResumeService(db).list(user.id))


@router.post("", response_model=DataResponse[ResumeResponse], status_code=status.HTTP_201_CREATED)
def create_resume(
    payload: ResumeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ResumeResponse]:
    return DataResponse(data=ResumeService(db).create(user.id, payload))


@router.get("/{resume_id}", response_model=DataResponse[ResumeResponse])
def get_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ResumeResponse]:
    return DataResponse(data=ResumeService(db).get(user.id, resume_id))


@router.patch("/{resume_id}", response_model=DataResponse[ResumeResponse])
def update_resume(
    resume_id: UUID,
    payload: ResumeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ResumeResponse]:
    return DataResponse(data=ResumeService(db).update(user.id, resume_id, payload))


@router.post("/{resume_id}/duplicate", response_model=DataResponse[ResumeResponse], status_code=201)
def duplicate_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ResumeResponse]:
    return DataResponse(data=ResumeService(db).duplicate(user.id, resume_id))


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    ResumeService(db).delete(user.id, resume_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{resume_id}/upload", response_model=DataResponse[ResumeUploadResponse])
async def upload_resume_file(
    resume_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[ResumeUploadResponse]:
    content = await file.read()
    resume, extraction = ResumeService(db).upload(
        user.id,
        resume_id,
        filename=file.filename or "resume",
        content_type=file.content_type,
        content=content,
    )
    return DataResponse(
        data=ResumeUploadResponse(
            resume=ResumeResponse.model_validate(resume),
            extraction=ResumeExtractionSummary(
                text=extraction.text,
                page_count=extraction.page_count,
                character_count=extraction.character_count,
                status=extraction.status,
                warnings=extraction.warnings,
            ),
        )
    )


@router.post("/{resume_id}/analyze", response_model=ResumeAnalyzeResponse)
def analyze_resume(
    resume_id: UUID,
    payload: ResumeAnalysisCreate,
    idempotency_key: UUID | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ResumeAnalyzeResponse:
    if payload.analysis_request_id is None:
        payload.analysis_request_id = idempotency_key
    analysis, resume = ResumeAnalysisService(db, settings).analyze(user.id, resume_id, payload)
    return ResumeAnalyzeResponse(
        analysis=ResumeAnalysisResponse.model_validate(analysis),
        resume=ResumeResponse.model_validate(resume),
    )


@router.get("/{resume_id}/analyses", response_model=DataResponse[list[ResumeAnalysisResponse]])
def list_resume_analyses(
    resume_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[list[ResumeAnalysisResponse]]:
    return DataResponse(data=ResumeAnalysisService(db, settings).list_for_resume(user.id, resume_id))
