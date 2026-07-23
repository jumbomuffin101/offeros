"""Add recruiting events and Google Calendar connections."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260722_0012"
down_revision: str | None = "20260722_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "application_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(30), server_default="upcoming", nullable=False),
        sa.Column("source", sa.String(30), server_default="manual", nullable=False),
        sa.Column("external_calendar_event_id", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_application_events_user_id", "application_events", ["user_id"])
    op.create_index("ix_application_events_application_id", "application_events", ["application_id"])
    op.create_index("ix_application_events_user_scheduled", "application_events", ["user_id", "deleted_at", "scheduled_at"])
    op.create_index("ix_application_events_application_scheduled", "application_events", ["application_id", "deleted_at", "scheduled_at"])
    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(40), server_default="google", nullable=False),
        sa.Column("provider_account_email", sa.String(320), server_default="", nullable=False),
        sa.Column("connection_status", sa.String(30), server_default="pending", nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), server_default="", nullable=False),
        sa.Column("refresh_token_encrypted", sa.Text(), server_default="", nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("oauth_state_hash", sa.String(64), nullable=True),
        sa.Column("oauth_state_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calendar_connections_user_id", "calendar_connections", ["user_id"])
    op.create_index("uq_calendar_connections_user_provider", "calendar_connections", ["user_id", "provider"], unique=True)


def downgrade() -> None:
    op.drop_table("calendar_connections")
    op.drop_table("application_events")
