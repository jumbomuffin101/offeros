from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    Difficulty,
    PrepStatus,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    enum_column,
    string_list_type,
)


class CodingProblem(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "coding_problems"
    __table_args__ = (
        CheckConstraint("target_time_minutes >= 5", name="ck_coding_target_time"),
        Index("ix_coding_problems_user_status", "user_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    difficulty: Mapped[Difficulty] = mapped_column(
        enum_column(Difficulty, "coding_difficulty"), default=Difficulty.MEDIUM
    )
    topic: Mapped[str] = mapped_column(String(120))
    target_time_minutes: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[PrepStatus] = mapped_column(
        enum_column(PrepStatus, "coding_status"), default=PrepStatus.NOT_STARTED
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="coding_problems")


class BehavioralQuestion(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "behavioral_questions"
    __table_args__ = (
        CheckConstraint(
            "confidence_score >= 1 AND confidence_score <= 5",
            name="ck_behavioral_confidence_score",
        ),
        Index("ix_behavioral_questions_user_status", "user_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(120))
    star_situation: Mapped[str] = mapped_column(Text, default="")
    star_task: Mapped[str] = mapped_column(Text, default="")
    star_action: Mapped[str] = mapped_column(Text, default="")
    star_result: Mapped[str] = mapped_column(Text, default="")
    confidence_score: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[PrepStatus] = mapped_column(
        enum_column(PrepStatus, "behavioral_status"), default=PrepStatus.NOT_STARTED
    )
    competency_tags: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    star_completeness_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    latest_evaluation_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    latest_evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evaluation_schema_version: Mapped[str] = mapped_column(String(40), default="behavioral-evaluation-v1")
    trend_summary_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    observation_summary_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    readiness_status: Mapped[str] = mapped_column(String(40), default="draft")
    career_context_version: Mapped[str | None] = mapped_column(String(40), nullable=True)

    user = relationship("User", back_populates="behavioral_questions")


class BehavioralStoryEvaluation(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "behavioral_story_evaluations"
    __table_args__ = (
        Index("ix_behavioral_evaluations_user_story_created", "user_id", "story_id", "created_at"),
        Index("ix_behavioral_evaluations_user_status", "user_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[UUID] = mapped_column(ForeignKey("behavioral_questions.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[UUID | None] = mapped_column(ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    competency_focus: Mapped[str | None] = mapped_column(String(80), nullable=True)
    evaluation_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    comparison_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    observation_summary_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    career_context_version: Mapped[str] = mapped_column(String(40), default="behavioral-context-v1")
    schema_version: Mapped[str] = mapped_column(String(40), default="behavioral-evaluation-v1")
    provider: Mapped[str] = mapped_column(String(80), default="deterministic")
    model: Mapped[str] = mapped_column(String(200), default="rules-v1")
    status: Mapped[str] = mapped_column(String(40), default="completed")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class BehavioralPracticeSession(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "behavioral_practice_sessions"
    __table_args__ = (
        Index("ix_behavioral_practice_user_story_created", "user_id", "story_id", "created_at"),
        Index("ix_behavioral_practice_user_status", "user_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[UUID | None] = mapped_column(ForeignKey("behavioral_questions.id", ondelete="CASCADE"), nullable=True, index=True)
    application_id: Mapped[UUID | None] = mapped_column(ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    competency: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, default="")
    evaluation_json: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
    status: Mapped[str] = mapped_column(String(40), default="completed")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SystemDesignPrompt(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "system_design_prompts"
    __table_args__ = (Index("ix_system_design_prompts_user_status", "user_id", "status"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    prompt: Mapped[str] = mapped_column(Text)
    concepts: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    status: Mapped[PrepStatus] = mapped_column(
        enum_column(PrepStatus, "system_design_status"), default=PrepStatus.NOT_STARTED
    )
    notes: Mapped[str] = mapped_column(Text, default="")

    user = relationship("User", back_populates="system_design_prompts")
