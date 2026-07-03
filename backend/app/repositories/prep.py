from datetime import UTC, datetime
from typing import TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt


PrepModel = TypeVar("PrepModel", CodingProblem, BehavioralQuestion, SystemDesignPrompt)


class PrepRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, model: type[PrepModel], user_id: UUID) -> list[PrepModel]:
        statement = (
            select(model)
            .where(model.user_id == user_id, model.deleted_at.is_(None))
            .order_by(model.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def get(self, model: type[PrepModel], user_id: UUID, item_id: UUID) -> PrepModel | None:
        statement = select(model).where(
            model.id == item_id,
            model.user_id == user_id,
            model.deleted_at.is_(None),
        )
        return self.db.scalar(statement)

    def create(self, model: type[PrepModel], user_id: UUID, values: dict[str, object]) -> PrepModel:
        item = model(user_id=user_id, **values)
        self.db.add(item)
        self.db.flush()
        return item

    def update(self, item: PrepModel, values: dict[str, object]) -> PrepModel:
        for field, value in values.items():
            setattr(item, field, value)
        self.db.flush()
        return item

    def soft_delete(self, item: PrepModel) -> None:
        item.deleted_at = datetime.now(UTC)
        self.db.flush()
