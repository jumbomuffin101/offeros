from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.prep import (
    BehavioralQuestionCreate,
    BehavioralQuestionResponse,
    BehavioralQuestionUpdate,
    CodingProblemCreate,
    CodingProblemResponse,
    CodingProblemUpdate,
    SystemDesignPromptCreate,
    SystemDesignPromptResponse,
    SystemDesignPromptUpdate,
)
from app.services.prep import PrepService


router = APIRouter(prefix="/prep", tags=["prep"])


@router.get("/coding", response_model=DataResponse[list[CodingProblemResponse]])
def list_coding(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[list[CodingProblemResponse]]:
    return DataResponse(data=PrepService(db).list(CodingProblem, user.id))


@router.post("/coding", response_model=DataResponse[CodingProblemResponse], status_code=201)
def create_coding(
    payload: CodingProblemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[CodingProblemResponse]:
    return DataResponse(data=PrepService(db).create(CodingProblem, user.id, payload))


@router.patch("/coding/{item_id}", response_model=DataResponse[CodingProblemResponse])
def update_coding(
    item_id: UUID,
    payload: CodingProblemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[CodingProblemResponse]:
    return DataResponse(data=PrepService(db).update(CodingProblem, user.id, item_id, payload))


@router.delete("/coding/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coding(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    PrepService(db).delete(CodingProblem, user.id, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/behavioral", response_model=DataResponse[list[BehavioralQuestionResponse]])
def list_behavioral(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[list[BehavioralQuestionResponse]]:
    return DataResponse(data=PrepService(db).list(BehavioralQuestion, user.id))


@router.post("/behavioral", response_model=DataResponse[BehavioralQuestionResponse], status_code=201)
def create_behavioral(
    payload: BehavioralQuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[BehavioralQuestionResponse]:
    return DataResponse(data=PrepService(db).create(BehavioralQuestion, user.id, payload))


@router.patch("/behavioral/{item_id}", response_model=DataResponse[BehavioralQuestionResponse])
def update_behavioral(
    item_id: UUID,
    payload: BehavioralQuestionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[BehavioralQuestionResponse]:
    return DataResponse(data=PrepService(db).update(BehavioralQuestion, user.id, item_id, payload))


@router.delete("/behavioral/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_behavioral(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    PrepService(db).delete(BehavioralQuestion, user.id, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/system-design", response_model=DataResponse[list[SystemDesignPromptResponse]])
def list_system_design(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DataResponse[list[SystemDesignPromptResponse]]:
    return DataResponse(data=PrepService(db).list(SystemDesignPrompt, user.id))


@router.post("/system-design", response_model=DataResponse[SystemDesignPromptResponse], status_code=201)
def create_system_design(
    payload: SystemDesignPromptCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[SystemDesignPromptResponse]:
    return DataResponse(data=PrepService(db).create(SystemDesignPrompt, user.id, payload))


@router.patch("/system-design/{item_id}", response_model=DataResponse[SystemDesignPromptResponse])
def update_system_design(
    item_id: UUID,
    payload: SystemDesignPromptUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataResponse[SystemDesignPromptResponse]:
    return DataResponse(data=PrepService(db).update(SystemDesignPrompt, user.id, item_id, payload))


@router.delete("/system-design/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_design(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    PrepService(db).delete(SystemDesignPrompt, user.id, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
