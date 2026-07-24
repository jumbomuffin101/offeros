from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settings import UserSettings
from app.models.application import Application
from app.models.application_prep import ApplicationPrepPlan
from app.models.prep import BehavioralQuestion, CodingProblem, SystemDesignPrompt
from app.models.resume import ResumeAnalysis, ResumeVersion
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
        if settings.onboarding_status == "not_started" and self._has_meaningful_data(user.id):
            settings.onboarding_status = "completed"
            settings.onboarding_step = 6
            settings.onboarding_completed_at = datetime.now(UTC)
            self.db.commit()
            self.db.refresh(settings)
        if self._sync_milestones(settings, user.id):
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
        if values.get("onboarding_status") == "completed":
            settings.onboarding_step = 6
            settings.onboarding_completed_at = settings.onboarding_completed_at or datetime.now(UTC)
        elif values.get("onboarding_status") == "skipped":
            settings.onboarding_skipped_at = settings.onboarding_skipped_at or datetime.now(UTC)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def _has_meaningful_data(self, user_id) -> bool:
        for model in (
            Application,
            ResumeVersion,
            CodingProblem,
            BehavioralQuestion,
            SystemDesignPrompt,
        ):
            statement = select(model.id).where(model.user_id == user_id)
            if hasattr(model, "deleted_at"):
                statement = statement.where(model.deleted_at.is_(None))
            if self.db.scalar(statement.limit(1)) is not None:
                return True
        return False

    def _sync_milestones(self, settings: UserSettings, user_id) -> bool:
        changed = False
        milestones = (
            ("first_resume_uploaded_at", ResumeVersion),
            ("first_application_created_at", Application),
            ("first_analysis_completed_at", ResumeAnalysis),
            ("first_prep_plan_created_at", ApplicationPrepPlan),
        )
        for field, model in milestones:
            if getattr(settings, field) is not None:
                continue
            timestamp = self.db.scalar(
                select(model.created_at)
                .where(model.user_id == user_id)
                .order_by(model.created_at)
                .limit(1)
            )
            if timestamp is not None:
                setattr(settings, field, timestamp)
                changed = True
        return changed
