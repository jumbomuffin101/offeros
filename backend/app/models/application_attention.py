from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ApplicationAttentionOverride(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "application_attention_overrides"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "application_id",
            "category",
            name="uq_application_attention_override_signal",
        ),
        Index(
            "ix_application_attention_overrides_user_until",
            "user_id",
            "dismissed_until",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(60))
    signal_key: Mapped[str] = mapped_column(String(64))
    dismissed_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dismissed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="application_attention_overrides")
    application = relationship("Application", back_populates="attention_overrides")
