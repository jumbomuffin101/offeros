"""Add Gmail-assisted application tracking."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260727_0017"
down_revision: str | None = "20260724_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "gmail_connections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("google_account_id", sa.String(255), nullable=True),
        sa.Column("gmail_address", sa.String(320), nullable=True),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=False, server_default=""),
        sa.Column("token_scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(30), nullable=False, server_default="connected"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_history_id", sa.String(100), nullable=True),
        sa.Column("initial_sync_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("watch_expiration_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("error_message_safe", sa.String(500), nullable=True),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("oauth_state_hash", sa.String(64), nullable=True),
        sa.Column("oauth_state_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pkce_verifier_encrypted", sa.Text(), nullable=True),
        sa.Column("sync_started_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_gmail_connections_user"),
        sa.UniqueConstraint("google_account_id", name="uq_gmail_connections_google_account"),
        sa.UniqueConstraint("oauth_state_hash", name="uq_gmail_connections_oauth_state"),
    )
    op.create_index("ix_gmail_connections_user_id", "gmail_connections", ["user_id"])
    op.create_index("ix_gmail_connections_status_updated", "gmail_connections", ["status", "updated_at"])

    op.create_table(
        "gmail_message_references",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_connection_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_message_id", sa.String(255), nullable=False),
        sa.Column("gmail_thread_id", sa.String(255), nullable=False, server_default=""),
        sa.Column("internal_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sender_email", sa.String(320), nullable=False, server_default=""),
        sa.Column("sender_name", sa.String(200), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False, server_default=""),
        sa.Column("snippet", sa.String(500), nullable=True),
        sa.Column("normalized_body_excerpt", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("history_id", sa.String(100), nullable=True),
        sa.Column("classification_status", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("processing_status", sa.String(30), nullable=False, server_default="discovered"),
        sa.Column("content_hash", sa.String(64), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gmail_connection_id"], ["gmail_connections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("gmail_connection_id", "gmail_message_id", name="uq_gmail_message_connection_message"),
    )
    op.create_index("ix_gmail_message_references_user_id", "gmail_message_references", ["user_id"])
    op.create_index("ix_gmail_messages_user_received", "gmail_message_references", ["user_id", "received_at"])
    op.create_index("ix_gmail_messages_processing", "gmail_message_references", ["gmail_connection_id", "processing_status"])

    op.create_table(
        "gmail_application_suggestions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_connection_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_message_reference_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("accepted_event_id", sa.Uuid(), nullable=True),
        sa.Column("suggestion_type", sa.String(50), nullable=False, server_default="add_timeline_event"),
        sa.Column("email_type", sa.String(50), nullable=False, server_default="unknown"),
        sa.Column("suggested_status", sa.String(30), nullable=True),
        sa.Column("suggested_event_type", sa.String(50), nullable=True),
        sa.Column("suggested_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suggested_deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_timezone", sa.String(80), nullable=True),
        sa.Column("date_is_ambiguous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("role_title", sa.String(200), nullable=True),
        sa.Column("recruiter_name", sa.String(200), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("evidence_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gmail_connection_id"], ["gmail_connections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gmail_message_reference_id"], ["gmail_message_references.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["accepted_event_id"], ["application_events.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("gmail_message_reference_id", name="uq_gmail_suggestion_message"),
    )
    op.create_index("ix_gmail_application_suggestions_user_id", "gmail_application_suggestions", ["user_id"])
    op.create_index("ix_gmail_suggestions_user_status", "gmail_application_suggestions", ["user_id", "status"])
    op.create_index("ix_gmail_suggestions_application_status", "gmail_application_suggestions", ["application_id", "status"])


def downgrade() -> None:
    op.drop_table("gmail_application_suggestions")
    op.drop_table("gmail_message_references")
    op.drop_table("gmail_connections")
