from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, string_list_type


class AnalyticsSnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analytics_snapshots"
    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date", "period", name="uq_analytics_snapshot_period"),
        Index("ix_analytics_snapshots_user_date", "user_id", "snapshot_date"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    snapshot_date: Mapped[date] = mapped_column(Date)
    period: Mapped[str] = mapped_column(String(20), default="weekly")
    metrics: Mapped[dict[str, object]] = mapped_column(string_list_type, default=dict)
