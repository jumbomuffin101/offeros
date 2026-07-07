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
    original_file_name: Mapped[str] = mapped_column(String(500), default="")
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    text_extraction_status: Mapped[str] = mapped_column(String(40), default="not_started")
    text_extraction_error: Mapped[str] = mapped_column(Text, default="")

    user = relationship("User", back_populates="resumes")
    analyses = relationship("ResumeAnalysis", back_populates="resume")


class ResumeAnalysis(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "resume_analyses"
    __table_args__ = (
        Index("ix_resume_analyses_user_resume_updated", "user_id", "resume_version_id", "updated_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resume_version_id: Mapped[UUID] = mapped_column(ForeignKey("resume_versions.id", ondelete="CASCADE"), index=True)
    target_role: Mapped[str] = mapped_column(String(200))
    job_description: Mapped[str] = mapped_column(Text, default="")
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    keyword_score: Mapped[int] = mapped_column(Integer, default=0)
    impact_score: Mapped[int] = mapped_column(Integer, default=0)
    clarity_score: Mapped[int] = mapped_column(Integer, default=0)
    technical_depth_score: Mapped[int] = mapped_column(Integer, default=0)
    missing_keywords: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    strong_keywords: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    weak_bullets: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    suggested_bullet_rewrites: Mapped[list[dict[str, str]]] = mapped_column(string_list_type, default=list)
    strengths: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    risks: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    recommendations: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(80), default="mock")
    model: Mapped[str] = mapped_column(String(120), default="local-mock")
    status: Mapped[str] = mapped_column(String(40), default="completed")
    error_message: Mapped[str] = mapped_column(Text, default="")

    user = relationship("User", back_populates="resume_analyses")
    resume = relationship("ResumeVersion", back_populates="analyses")
