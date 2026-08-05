from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.base import PrepStatus
from app.models.prep import BehavioralPracticeSession, BehavioralQuestion, BehavioralStoryEvaluation, CodingProblem, SystemDesignPrompt
from app.repositories.prep import PrepRepository
from app.schemas.common import persistence_values
from app.services.validation import reject_null_fields
from app.services.behavioral_intelligence import BehavioralCoachService


PrepModel = TypeVar("PrepModel", CodingProblem, BehavioralQuestion, SystemDesignPrompt)
logger = logging.getLogger(__name__)


class PrepService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PrepRepository(db)

    def list(self, model: type[PrepModel], user_id: UUID) -> list[PrepModel]:
        return self.repository.list(model, user_id)

    def create(self, model: type[PrepModel], user_id: UUID, payload: BaseModel) -> PrepModel:
        values = persistence_values(payload)
        self._set_completion(model, values)
        item = self.repository.create(model, user_id, values)
        self._refresh_behavioral(model, item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update(
        self, model: type[PrepModel], user_id: UUID, item_id: UUID, payload: BaseModel
    ) -> PrepModel:
        item = self.repository.get(model, user_id, item_id)
        if item is None:
            raise NotFoundError(self._resource_name(model))
        values = persistence_values(payload, exclude_unset=True)
        nullable_fields = {"link"} if model is CodingProblem else set()
        reject_null_fields(values, set(type(payload).model_fields) - nullable_fields)
        self._set_completion(model, values, item)
        self.repository.update(item, values)
        self._refresh_behavioral(model, item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, model: type[PrepModel], user_id: UUID, item_id: UUID) -> None:
        item = self.repository.get(model, user_id, item_id)
        if item is None:
            raise NotFoundError(self._resource_name(model))
        if model is BehavioralQuestion:
            for related_model in (BehavioralStoryEvaluation, BehavioralPracticeSession):
                for row in self.db.scalars(select(related_model).where(related_model.user_id == user_id, related_model.story_id == item_id, related_model.deleted_at.is_(None))):
                    self.repository.soft_delete(row)
        self.repository.soft_delete(item)
        self.db.commit()

    @staticmethod
    def _set_completion(
        model: type[PrepModel], values: dict[str, object], item: PrepModel | None = None
    ) -> None:
        if model is not CodingProblem or "status" not in values:
            return
        status_value = values["status"]
        is_completed = status_value in {PrepStatus.COMPLETED, PrepStatus.COMPLETED.value}
        values["completed_at"] = (getattr(item, "completed_at", None) or datetime.now(UTC)) if is_completed else None

    @staticmethod
    def _resource_name(model: type[PrepModel]) -> str:
        names = {
            CodingProblem: "Coding problem",
            BehavioralQuestion: "Behavioral question",
            SystemDesignPrompt: "System design prompt",
        }
        return names[model]

    def _refresh_behavioral(self, model: type[PrepModel], item: PrepModel) -> None:
        if model is not BehavioralQuestion:
            return
        try:
            BehavioralCoachService(self.db).refresh_story_summary(item)
        except Exception:
            logger.warning("behavioral_intelligence.summary_refresh_failed story_id=%s", item.id)
