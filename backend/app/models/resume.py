from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    ResumeStatus,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    enum_column,
    string_list_type,
)


class ResumeVersion(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "resume_versions"
    __table_args__ = (
        CheckConstraint(
            "keyword_match_score >= 0 AND keyword_match_score <= 100",
            name="ck_resume_keyword_match_score",
        ),
        Index("ix_resume_versions_user_updated", "user_id", "updated_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    target_role: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ResumeStatus] = mapped_column(
        enum_column(ResumeStatus, "resume_status"), default=ResumeStatus.DRAFT
    )
    keyword_match_score: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    strengths: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    weaknesses: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    missing_keywords: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    suggested_improvement: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    file_name: Mapped[str] = mapped_column(String(500), default="")

    user = relationship("User", back_populates="resumes")
