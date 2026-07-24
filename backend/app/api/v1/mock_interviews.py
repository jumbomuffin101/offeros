from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.mock_interview import MockInterviewTurn
from app.schemas.common import DataResponse
from app.schemas.mock_interview import (
    MockInterviewAnswerRequest,
    MockInterviewAnswerResponse,
    MockInterviewCreate,
    MockInterviewCreateResponse,
    MockInterviewSessionResponse,
    MockInterviewSessionSummary,
)
from app.services.mock_interviews import MockInterviewService
from app.services.usage import AIUsageService
from app.services.notifications import NotificationService
from app.schemas.launch import NotificationCreate


router = APIRouter(prefix="/mock-interviews", tags=["mock-interviews"])


@router.get("", response_model=DataResponse[list[MockInterviewSessionSummary]])
def list_mock_interviews(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[list[MockInterviewSessionSummary]]:
    return DataResponse(data=MockInterviewService(db, settings).list(user.id))


@router.post("", response_model=MockInterviewCreateResponse, status_code=201)
def create_mock_interview(
    payload: MockInterviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MockInterviewCreateResponse:
    with AIUsageService(db, settings).track(
        user.id,
        "mock_interview",
        provider=settings.ai_provider,
        model=settings.ai_model,
    ):
        return MockInterviewService(db, settings).create(user.id, payload)


@router.get(
    "/{session_id}", response_model=DataResponse[MockInterviewSessionResponse]
)
def get_mock_interview(
    session_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[MockInterviewSessionResponse]:
    return DataResponse(
        data=MockInterviewService(db, settings).get(user.id, session_id)
    )


@router.post(
    "/{session_id}/answer", response_model=MockInterviewAnswerResponse
)
def answer_mock_interview(
    session_id: UUID,
    payload: MockInterviewAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MockInterviewAnswerResponse:
    duplicate = payload.answer_request_id and db.scalar(
        select(MockInterviewTurn.id).where(
            MockInterviewTurn.session_id == session_id,
            MockInterviewTurn.answer_request_id == payload.answer_request_id,
        )
    )
    if duplicate:
        result = MockInterviewService(db, settings).answer(
            user.id, session_id, payload
        )
    else:
        with AIUsageService(db, settings).track(
            user.id,
            "mock_interview_turn",
            provider=settings.ai_provider,
            model=settings.ai_model,
            resource_id=session_id,
        ):
            result = MockInterviewService(db, settings).answer(
                user.id, session_id, payload
            )
    if result.session.status == "completed":
        NotificationService(db).create(
            user.id,
            NotificationCreate(
                type="mock_interview_completed",
                title="Mock interview completed",
                message=f"{result.session.title} is ready to review.",
                action_url=f"/prep?tab=mock-interviews&session={session_id}",
                action_label="View scorecard",
                dedupe_key=f"mock-interview:{session_id}:completed",
            ),
        )
    return result


@router.post(
    "/{session_id}/abandon",
    response_model=DataResponse[MockInterviewSessionResponse],
)
def abandon_mock_interview(
    session_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataResponse[MockInterviewSessionResponse]:
    return DataResponse(
        data=MockInterviewService(db, settings).abandon(user.id, session_id)
    )
