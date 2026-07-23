from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ApplicationEvent(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "application_events"
    __table_args__ = (
        Index("ix_application_events_user_scheduled", "user_id", "deleted_at", "scheduled_at"),
        Index("ix_application_events_application_scheduled", "application_id", "deleted_at", "scheduled_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text, default="")
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="upcoming")
    source: Mapped[str] = mapped_column(String(30), default="manual")
    external_calendar_event_id: Mapped[str | None] = mapped_column(String(500), nullable=True)

    application = relationship("Application", back_populates="events")
    user = relationship("User", back_populates="application_events")
