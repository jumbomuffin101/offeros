from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.coding import (
    CodingActivityCreate, CodingActivityImport, CodingActivityPage, CodingActivityResponse,
    CodingActivityUpdate, CodingGoalResponse, CodingGoalUpdate, CodingImportResponse,
    CodingProfileConnect, CodingProfileResponse, CodingSummaryResponse, CodingSyncResponse,
)
from app.schemas.common import DataResponse
from app.services.coding_intelligence import CodingIntelligenceService


router = APIRouter(prefix="/prep", tags=["coding-intelligence"])


@router.post("/coding-profile/connect", response_model=DataResponse[CodingProfileResponse])
def connect(payload: CodingProfileConnect, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingProfileResponse]:
    return DataResponse(data=CodingIntelligenceService(db).connect(user.id, payload))


@router.get("/coding-profile", response_model=DataResponse[CodingProfileResponse | None])
def profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingProfileResponse | None]:
    return DataResponse(data=CodingIntelligenceService(db).connection(user.id))


@router.post("/coding-profile/sync", response_model=DataResponse[CodingSyncResponse])
def sync(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingSyncResponse]:
    return DataResponse(data=CodingIntelligenceService(db).sync(user.id))


@router.delete("/coding-profile", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    CodingIntelligenceService(db).disconnect(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/coding-activities", response_model=DataResponse[CodingActivityPage])
def activities(limit: int = Query(default=30, ge=1, le=100), offset: int = Query(default=0, ge=0), difficulty: str | None = None, topic: str | None = None, activity_status: str | None = Query(default=None, alias="status"), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingActivityPage]:
    return DataResponse(data=CodingIntelligenceService(db).list_activities(user.id, limit=limit, offset=offset, difficulty=difficulty, topic=topic, status=activity_status))


@router.post("/coding-activities", response_model=DataResponse[CodingActivityResponse], status_code=201)
def create_activity(payload: CodingActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingActivityResponse]:
    return DataResponse(data=CodingIntelligenceService(db).create_activity(user.id, payload))


@router.patch("/coding-activities/{activity_id}", response_model=DataResponse[CodingActivityResponse])
def update_activity(activity_id: UUID, payload: CodingActivityUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingActivityResponse]:
    return DataResponse(data=CodingIntelligenceService(db).update_activity(user.id, activity_id, payload))


@router.delete("/coding-activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    CodingIntelligenceService(db).delete_activity(user.id, activity_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/coding-activities/import", response_model=DataResponse[CodingImportResponse])
def import_activities(payload: CodingActivityImport, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingImportResponse]:
    return DataResponse(data=CodingIntelligenceService(db).import_activities(user.id, payload))


@router.get("/coding-summary", response_model=DataResponse[CodingSummaryResponse])
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingSummaryResponse]:
    return DataResponse(data=CodingIntelligenceService(db).summary(user.id))


@router.post("/coding-goal", response_model=DataResponse[CodingGoalResponse])
def save_goal(payload: CodingGoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DataResponse[CodingGoalResponse]:
    return DataResponse(data=CodingIntelligenceService(db).save_goal(user.id, payload))
