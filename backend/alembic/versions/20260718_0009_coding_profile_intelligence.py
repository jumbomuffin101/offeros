"""Add coding profile connections, activities, and goals.

Revision ID: 20260718_0009
Revises: 20260718_0008
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260718_0009"
down_revision: str | None = "20260718_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "coding_profile_connections",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False), sa.Column("username", sa.String(80), nullable=False),
        sa.Column("profile_url", sa.String(2048), nullable=False), sa.Column("connection_status", sa.String(30), nullable=False),
        sa.Column("sync_status", sa.String(30), nullable=False), sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_error", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_coding_profile_user_provider"),
    )
    op.create_index("ix_coding_profile_connections_user_id", "coding_profile_connections", ["user_id"])
    op.create_table(
        "coding_activities",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False), sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("problem_title", sa.String(300), nullable=False), sa.Column("problem_slug", sa.String(300), nullable=True), sa.Column("problem_url", sa.String(2048), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=False), sa.Column("topics", sa.JSON(), nullable=False), sa.Column("status", sa.String(20), nullable=False),
        sa.Column("solved_at", sa.DateTime(timezone=True), nullable=True), sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=True), sa.Column("time_spent_minutes", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=False), sa.Column("source", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", "external_id", name="uq_coding_activity_external"),
    )
    op.create_index("ix_coding_activities_user_id", "coding_activities", ["user_id"])
    op.create_index("ix_coding_activities_user_solved", "coding_activities", ["user_id", "solved_at"])
    op.create_index("ix_coding_activities_user_status", "coding_activities", ["user_id", "status"])
    op.create_table(
        "coding_goals",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("target_problems", sa.Integer(), nullable=False), sa.Column("target_minutes", sa.Integer(), nullable=False), sa.Column("difficulty_target", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("user_id", name="uq_coding_goal_user"),
    )
    op.create_index("ix_coding_goals_user_id", "coding_goals", ["user_id"])


def downgrade() -> None:
    op.drop_table("coding_goals")
    op.drop_table("coding_activities")
    op.drop_table("coding_profile_connections")
