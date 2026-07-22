from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settings import UserSettings
from app.models.resume import ResumeVersion
from app.models.user import User
from app.schemas.settings import UserSettingsUpdate
from app.services.validation import reject_null_fields


class SettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create(self, user: User) -> UserSettings:
        settings = self.db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
        if settings is None:
            settings = UserSettings(user_id=user.id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update(self, user: User, payload: UserSettingsUpdate) -> UserSettings:
        settings = self.get_or_create(user)
        values = payload.model_dump(exclude_unset=True)
        reject_null_fields(
            values,
            set(UserSettingsUpdate.model_fields) - {"default_resume_version_id"},
        )
        if values.get("default_resume_version_id") is not None:
            resume = self.db.scalar(select(ResumeVersion).where(ResumeVersion.id == values["default_resume_version_id"], ResumeVersion.user_id == user.id, ResumeVersion.deleted_at.is_(None)))
            if resume is None:
                from app.core.errors import ValidationError
                raise ValidationError("Choose a resume owned by your OfferOS account.")
        for field, value in values.items():
            setattr(settings, field, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings
