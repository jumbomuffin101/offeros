from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, Uuid
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
        Index("ix_applications_user_external_job", "user_id", "source", "external_job_id"),
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
    external_job_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resume_used: Mapped[str] = mapped_column(String(200), default="")
    resume_version_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resume_analysis_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resume_analyses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    job_description: Mapped[str] = mapped_column(Text, default="")
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
    selected_resume = relationship("ResumeVersion", foreign_keys=[resume_version_id])
    resume_analysis = relationship("ResumeAnalysis", foreign_keys=[resume_analysis_id])
    prep_plan = relationship("ApplicationPrepPlan", back_populates="application", uselist=False)
    events = relationship("ApplicationEvent", back_populates="application", cascade="all, delete-orphan")
