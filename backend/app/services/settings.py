from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settings import UserSettings
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
        reject_null_fields(values, set(UserSettingsUpdate.model_fields))
        for field, value in values.items():
            setattr(settings, field, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings
