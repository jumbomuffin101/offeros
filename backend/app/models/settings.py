from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserSettings(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_settings"
    __table_args__ = (CheckConstraint("theme IN ('dark', 'light', 'system')", name="ck_settings_theme"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    theme: Mapped[str] = mapped_column(String(20), default="dark")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    default_resume_version_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    default_run_resume_analysis: Mapped[bool] = mapped_column(Boolean, default=False)
    default_generate_prep_plan: Mapped[bool] = mapped_column(Boolean, default=False)
    default_application_status: Mapped[str] = mapped_column(String(30), default="wishlist")
    onboarding_status: Mapped[str] = mapped_column(String(30), default="not_started")
    onboarding_step: Mapped[int] = mapped_column(Integer, default=1)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    onboarding_skipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_resume_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_application_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_analysis_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_prep_plan_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    weekly_application_goal: Mapped[int] = mapped_column(Integer, default=5)
    weekly_coding_goal: Mapped[int] = mapped_column(Integer, default=5)
    weekly_mock_interview_goal: Mapped[int] = mapped_column(Integer, default=2)
    weekly_follow_up_goal: Mapped[int] = mapped_column(Integer, default=3)
    default_interview_difficulty: Mapped[str] = mapped_column(String(30), default="standard")
    default_mock_interview_length: Mapped[int] = mapped_column(Integer, default=5)

    user = relationship("User", back_populates="settings")
