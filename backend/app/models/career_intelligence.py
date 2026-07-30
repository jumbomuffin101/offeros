from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, string_list_type


class CareerObservation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "career_observations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'resolved', 'superseded', 'expired', 'dismissed')",
            name="ck_career_observations_status",
        ),
        Index("ix_career_observations_user_status", "user_id", "status"),
        Index("ix_career_observations_user_type_confirmed", "user_id", "observation_type", "last_confirmed_at"),
        Index("uq_career_observations_user_key", "user_id", "dedupe_key", unique=True),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dedupe_key: Mapped[str] = mapped_column(String(180))
    observation_type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(240))
    summary: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    source_type: Mapped[str] = mapped_column(String(50))
    source_ids_json: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    evidence_json: Mapped[list[dict[str, object]]] = mapped_column(string_list_type, default=list)
    status: Mapped[str] = mapped_column(String(30), default="active")
    first_observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="career_observations")
