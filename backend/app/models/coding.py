from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin, string_list_type


class CodingProfileConnection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coding_profile_connections"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_coding_profile_user_provider"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(40))
    username: Mapped[str] = mapped_column(String(80))
    profile_url: Mapped[str] = mapped_column(String(2048))
    connection_status: Mapped[str] = mapped_column(String(30), default="connected")
    sync_status: Mapped[str] = mapped_column(String(30), default="never_synced")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_error: Mapped[str] = mapped_column(Text, default="")

    user = relationship("User", back_populates="coding_profile_connections")


class CodingActivity(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "coding_activities"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "external_id", name="uq_coding_activity_external"),
        Index("ix_coding_activities_user_solved", "user_id", "solved_at"),
        Index("ix_coding_activities_user_status", "user_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(40), default="manual")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_title: Mapped[str] = mapped_column(String(300))
    problem_slug: Mapped[str | None] = mapped_column(String(300), nullable=True)
    problem_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    topics: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    status: Mapped[str] = mapped_column(String(20), default="solved")
    solved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    time_spent_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(30), default="manual")

    user = relationship("User", back_populates="coding_activities")


class CodingGoal(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coding_goals"
    __table_args__ = (UniqueConstraint("user_id", name="uq_coding_goal_user"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_problems: Mapped[int] = mapped_column(Integer, default=5)
    target_minutes: Mapped[int] = mapped_column(Integer, default=180)
    difficulty_target: Mapped[str | None] = mapped_column(String(20), nullable=True)

    user = relationship("User", back_populates="coding_goal")
