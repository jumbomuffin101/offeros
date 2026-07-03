from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.application import Application
from app.repositories.applications import ApplicationRepository
from app.schemas.application import ApplicationCreate, ApplicationUpdate
from app.schemas.common import persistence_values
from app.services.validation import reject_null_fields


class ApplicationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ApplicationRepository(db)

    def list(self, user_id: UUID) -> list[Application]:
        return self.repository.list(user_id)

    def get(self, user_id: UUID, application_id: UUID) -> Application:
        application = self.repository.get(user_id, application_id)
        if application is None:
            raise NotFoundError("Application")
        return application

    def create(self, user_id: UUID, payload: ApplicationCreate) -> Application:
        application = self.repository.create(user_id, persistence_values(payload))
        self.db.commit()
        self.db.refresh(application)
        return application

    def update(
        self, user_id: UUID, application_id: UUID, payload: ApplicationUpdate
    ) -> Application:
        application = self.get(user_id, application_id)
        values = persistence_values(payload, exclude_unset=True)
        reject_null_fields(
            values,
            {
                "company",
                "role",
                "location",
                "status",
                "source",
                "resume_used",
                "recruiter_name",
                "salary_range",
                "priority",
                "notes",
                "tags",
            },
        )
        self.repository.update(application, values)
        self.db.commit()
        self.db.refresh(application)
        return application

    def delete(self, user_id: UUID, application_id: UUID) -> None:
        application = self.get(user_id, application_id)
        self.repository.soft_delete(application)
        self.db.commit()
