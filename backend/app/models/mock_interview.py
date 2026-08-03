from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    string_list_type,
)


class MockInterviewSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mock_interview_sessions"
    __table_args__ = (
        Index(
            "ix_mock_interview_sessions_user_updated",
            "user_id",
            "updated_at",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resume_version_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("resume_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    interview_type: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(30), default="created", index=True)
    difficulty: Mapped[str] = mapped_column(String(30), default="standard")
    title: Mapped[str] = mapped_column(String(240))
    target_role: Mapped[str] = mapped_column(String(200))
    company_name: Mapped[str] = mapped_column(String(200), default="")
    question_count: Mapped[int] = mapped_column(Integer, default=5)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0)
    current_follow_up_count: Mapped[int] = mapped_column(Integer, default=0)
    context_sources: Mapped[list[str]] = mapped_column(
        string_list_type, default=list
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(80), default="")
    model: Mapped[str] = mapped_column(String(160), default="")
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    career_context_version: Mapped[str] = mapped_column(String(60), default="")
    career_context_json: Mapped[dict] = mapped_column(string_list_type, default=dict)
    question_plan_json: Mapped[dict] = mapped_column(string_list_type, default=dict)
    trend_delta_json: Mapped[dict] = mapped_column(string_list_type, default=dict)
    observation_summary_json: Mapped[list[dict[str, object]]] = mapped_column(
        string_list_type, default=list
    )
    intelligence_status: Mapped[str] = mapped_column(
        String(30), default="unavailable"
    )

    user = relationship("User", back_populates="mock_interview_sessions")
    turns = relationship(
        "MockInterviewTurn",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="MockInterviewTurn.turn_index",
    )
    scorecard = relationship(
        "MockInterviewScorecard",
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False,
    )


class MockInterviewTurn(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "mock_interview_turns"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "turn_index",
            name="uq_mock_interview_turn_index",
        ),
        UniqueConstraint(
            "session_id",
            "answer_request_id",
            name="uq_mock_interview_answer_request",
        ),
        Index(
            "ix_mock_interview_turns_session_created",
            "session_id",
            "created_at",
        ),
    )

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    turn_index: Mapped[int] = mapped_column(Integer)
    speaker: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str | None] = mapped_column(
        String(40), nullable=True
    )
    evaluation_json: Mapped[dict | None] = mapped_column(
        string_list_type, nullable=True
    )
    answer_request_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    session = relationship("MockInterviewSession", back_populates="turns")


class MockInterviewScorecard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mock_interview_scorecards"

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    communication_score: Mapped[int] = mapped_column(Integer)
    technical_accuracy_score: Mapped[int] = mapped_column(Integer)
    structure_score: Mapped[int] = mapped_column(Integer)
    depth_score: Mapped[int] = mapped_column(Integer)
    relevance_score: Mapped[int] = mapped_column(Integer)
    behavioral_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resume_fluency_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    system_design_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    technical_reasoning_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    strengths: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    weaknesses: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    missed_points: Mapped[list[str]] = mapped_column(
        string_list_type, default=list
    )
    strongest_answer: Mapped[str] = mapped_column(Text, default="")
    weakest_answer: Mapped[str] = mapped_column(Text, default="")
    recommended_actions: Mapped[list[str]] = mapped_column(
        string_list_type, default=list
    )
    summary: Mapped[str] = mapped_column(Text)

    session = relationship("MockInterviewSession", back_populates="scorecard")
