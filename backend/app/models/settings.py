from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Uuid
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

    user = relationship("User", back_populates="settings")
