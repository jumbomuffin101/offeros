from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application


class ApplicationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, user_id: UUID) -> list[Application]:
        statement = (
            select(Application)
            .where(Application.user_id == user_id, Application.deleted_at.is_(None))
            .order_by(Application.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def get(self, user_id: UUID, application_id: UUID) -> Application | None:
        statement = select(Application).where(
            Application.id == application_id,
            Application.user_id == user_id,
            Application.deleted_at.is_(None),
        )
        return self.db.scalar(statement)

    def create(self, user_id: UUID, values: dict[str, object]) -> Application:
        application = Application(user_id=user_id, **values)
        self.db.add(application)
        self.db.flush()
        return application

    def update(self, application: Application, values: dict[str, object]) -> Application:
        for field, value in values.items():
            setattr(application, field, value)
        self.db.flush()
        return application

    def soft_delete(self, application: Application) -> None:
        application.deleted_at = datetime.now(UTC)
        self.db.flush()
