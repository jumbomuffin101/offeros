from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, string_list_type


class GmailConnection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "gmail_connections"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_gmail_connections_user"),
        UniqueConstraint("google_account_id", name="uq_gmail_connections_google_account"),
        Index("ix_gmail_connections_status_updated", "status", "updated_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    google_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gmail_address: Mapped[str | None] = mapped_column(String(320), nullable=True)
    encrypted_refresh_token: Mapped[str] = mapped_column(Text, default="")
    token_scopes: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    status: Mapped[str] = mapped_column(String(30), default="connected")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_history_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    initial_sync_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    watch_expiration_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    error_message_safe: Mapped[str | None] = mapped_column(String(500), nullable=True)
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    oauth_state_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    oauth_state_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pkce_verifier_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    sync_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="gmail_connection")
    messages = relationship("GmailMessageReference", cascade="all, delete-orphan")
    suggestions = relationship("GmailApplicationSuggestion", cascade="all, delete-orphan")


class GmailMessageReference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "gmail_message_references"
    __table_args__ = (
        UniqueConstraint("gmail_connection_id", "gmail_message_id", name="uq_gmail_message_connection_message"),
        Index("ix_gmail_messages_user_received", "user_id", "received_at"),
        Index("ix_gmail_messages_processing", "gmail_connection_id", "processing_status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    gmail_connection_id: Mapped[UUID] = mapped_column(ForeignKey("gmail_connections.id", ondelete="CASCADE"), index=True)
    gmail_message_id: Mapped[str] = mapped_column(String(255))
    gmail_thread_id: Mapped[str] = mapped_column(String(255), default="")
    internal_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sender_email: Mapped[str] = mapped_column(String(320), default="")
    sender_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    subject: Mapped[str] = mapped_column(String(500), default="")
    snippet: Mapped[str | None] = mapped_column(String(500), nullable=True)
    normalized_body_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    history_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    classification_status: Mapped[str] = mapped_column(String(30), default="unknown")
    processing_status: Mapped[str] = mapped_column(String(30), default="discovered")
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)


class GmailApplicationSuggestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "gmail_application_suggestions"
    __table_args__ = (
        UniqueConstraint("gmail_message_reference_id", name="uq_gmail_suggestion_message"),
        Index("ix_gmail_suggestions_user_status", "user_id", "status"),
        Index("ix_gmail_suggestions_application_status", "application_id", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    gmail_connection_id: Mapped[UUID] = mapped_column(ForeignKey("gmail_connections.id", ondelete="CASCADE"), index=True)
    gmail_message_reference_id: Mapped[UUID] = mapped_column(ForeignKey("gmail_message_references.id", ondelete="CASCADE"))
    application_id: Mapped[UUID | None] = mapped_column(ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    accepted_event_id: Mapped[UUID | None] = mapped_column(ForeignKey("application_events.id", ondelete="SET NULL"), nullable=True)
    suggestion_type: Mapped[str] = mapped_column(String(50), default="add_timeline_event")
    email_type: Mapped[str] = mapped_column(String(50), default="unknown")
    suggested_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    suggested_event_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    suggested_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suggested_deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_timezone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    date_is_ambiguous: Mapped[bool] = mapped_column(default=False)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    role_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recruiter_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    evidence_json: Mapped[list[str]] = mapped_column(string_list_type, default=list)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
