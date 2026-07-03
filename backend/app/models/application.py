from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    ApplicationStatus,
    Base,
    Priority,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    enum_column,
    string_list_type,
)


class Application(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (
        Index("ix_applications_user_status_updated", "user_id", "status", "updated_at"),
        Index("ix_applications_user_deadline", "user_id", "deadline"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    company: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[ApplicationStatus] = mapped_column(
        enum_column(ApplicationStatus, "application_status"), default=ApplicationStatus.WISHLIST
    )
    date_applied: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    source: Mapped[str] = mapped_column(String(120), default="")
    resume_used: Mapped[str] = mapped_column(String(200), default="")
    job_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    recruiter_name: Mapped[str] = mapped_column(String(200), default="")
    recruiter_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    salary_range: Mapped[str] = mapped_column(String(200), default="")
    priority: Mapped[Priority] = mapped_column(
        enum_column(Priority, "application_priority"), default=Priority.MEDIUM
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(string_list_type, default=list)

    user = relationship("User", back_populates="applications")
