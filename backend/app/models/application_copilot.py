from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ApplicationCopilotConversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "application_copilot_conversations"
    __table_args__ = (
        Index(
            "ix_application_copilot_conversations_user_application_updated",
            "user_id",
            "application_id",
            "updated_at",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )

    user = relationship("User", back_populates="application_copilot_conversations")
    application = relationship("Application", back_populates="copilot_conversations")
    messages = relationship(
        "ApplicationCopilotMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ApplicationCopilotMessage.created_at",
    )


class ApplicationCopilotMessage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "application_copilot_messages"
    __table_args__ = (
        Index(
            "ix_application_copilot_messages_conversation_created",
            "conversation_id",
            "created_at",
        ),
    )

    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("application_copilot_conversations.id", ondelete="CASCADE"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(80), default="")
    model: Mapped[str] = mapped_column(String(160), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    conversation = relationship("ApplicationCopilotConversation", back_populates="messages")
