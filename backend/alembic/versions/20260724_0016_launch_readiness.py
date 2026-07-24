"""Add launch readiness state, notifications, and AI usage."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260724_0016"
down_revision: str | None = "20260724_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    settings_columns = [
        sa.Column("onboarding_status", sa.String(30), nullable=False, server_default="not_started"),
        sa.Column("onboarding_step", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("onboarding_skipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_resume_uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_application_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_analysis_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_prep_plan_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("weekly_application_goal", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("weekly_coding_goal", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("weekly_mock_interview_goal", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("weekly_follow_up_goal", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("default_interview_difficulty", sa.String(30), nullable=False, server_default="standard"),
        sa.Column("default_mock_interview_length", sa.Integer(), nullable=False, server_default="5"),
    ]
    for column in settings_columns:
        op.add_column("user_settings", column)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(60), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("action_label", sa.String(120), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dedupe_key", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "read_at"])
    op.create_index(
        "uq_notifications_user_dedupe",
        "notifications",
        ["user_id", "dedupe_key"],
        unique=True,
        postgresql_where=sa.text("dedupe_key IS NOT NULL"),
        sqlite_where=sa.text("dedupe_key IS NOT NULL"),
    )

    op.create_table(
        "ai_usage_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("operation", sa.String(80), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("model", sa.String(180), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("estimated_cost", sa.Numeric(12, 6), nullable=True),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_usage_events_user_id", "ai_usage_events", ["user_id"])
    op.create_index("ix_ai_usage_events_operation", "ai_usage_events", ["operation"])
    op.create_index("ix_ai_usage_events_status", "ai_usage_events", ["status"])
    op.create_index("ix_ai_usage_user_operation_created", "ai_usage_events", ["user_id", "operation", "created_at"])
    op.create_index("ix_ai_usage_user_status_created", "ai_usage_events", ["user_id", "status", "created_at"])


def downgrade() -> None:
    op.drop_table("ai_usage_events")
    op.drop_index("uq_notifications_user_dedupe", table_name="notifications")
    op.drop_table("notifications")
    for name in [
        "default_mock_interview_length",
        "default_interview_difficulty",
        "weekly_follow_up_goal",
        "weekly_mock_interview_goal",
        "weekly_coding_goal",
        "weekly_application_goal",
        "first_prep_plan_created_at",
        "first_analysis_completed_at",
        "first_application_created_at",
        "first_resume_uploaded_at",
        "onboarding_skipped_at",
        "onboarding_completed_at",
        "onboarding_step",
        "onboarding_status",
    ]:
        op.drop_column("user_settings", name)
