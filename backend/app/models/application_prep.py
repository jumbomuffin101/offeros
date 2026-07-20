from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, string_list_type


class ApplicationPrepPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "application_prep_plans"
    __table_args__ = (UniqueConstraint("application_id", name="uq_application_prep_plan_application"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="ready")
    coding: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    behavioral: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    system_design: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    overall_preparation_summary: Mapped[str] = mapped_column(Text, default="")
    next_best_action: Mapped[str] = mapped_column(Text, default="")
    source_job_description: Mapped[str] = mapped_column(Text, default="")
    source_resume_analysis_id: Mapped[UUID | None] = mapped_column(nullable=True)
    provider: Mapped[str] = mapped_column(String(80), default="deterministic")
    model: Mapped[str] = mapped_column(String(120), default="rule-based-v1")
    generated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user = relationship("User", back_populates="application_prep_plans")
    application = relationship("Application", back_populates="prep_plan")
