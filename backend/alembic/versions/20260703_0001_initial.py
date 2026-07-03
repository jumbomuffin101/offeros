"""Create initial OfferOS backend tables.

Revision ID: 20260703_0001
Revises: None
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260703_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


application_status = sa.Enum(
    "wishlist", "applying", "applied", "oa", "interview", "final_round", "offer", "rejected",
    name="application_status", native_enum=False, create_constraint=True,
)
application_priority = sa.Enum(
    "low", "medium", "high", name="application_priority", native_enum=False, create_constraint=True
)
resume_status = sa.Enum(
    "active", "draft", name="resume_status", native_enum=False, create_constraint=True
)
coding_difficulty = sa.Enum(
    "easy", "medium", "hard", name="coding_difficulty", native_enum=False, create_constraint=True
)
coding_status = sa.Enum(
    "not_started", "in_progress", "completed", "skipped",
    name="coding_status", native_enum=False, create_constraint=True,
)
behavioral_status = sa.Enum(
    "not_started", "in_progress", "completed", "skipped",
    name="behavioral_status", native_enum=False, create_constraint=True,
)
system_design_status = sa.Enum(
    "not_started", "in_progress", "completed", "skipped",
    name="system_design_status", native_enum=False, create_constraint=True,
)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clerk_user_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clerk_user_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("company", sa.String(200), nullable=False),
        sa.Column("role", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200), nullable=False),
        sa.Column("status", application_status, nullable=False),
        sa.Column("date_applied", sa.Date(), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("resume_used", sa.String(200), nullable=False),
        sa.Column("job_url", sa.String(2048), nullable=True),
        sa.Column("recruiter_name", sa.String(200), nullable=False),
        sa.Column("recruiter_email", sa.String(320), nullable=True),
        sa.Column("salary_range", sa.String(200), nullable=False),
        sa.Column("priority", application_priority, nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("tags", postgresql.JSONB(), nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_applications_user_id", "applications", ["user_id"])
    op.create_index("ix_applications_user_status_updated", "applications", ["user_id", "status", "updated_at"])
    op.create_index("ix_applications_user_deadline", "applications", ["user_id", "deadline"])

    op.create_table(
        "resume_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("target_role", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", resume_status, nullable=False),
        sa.Column("keyword_match_score", sa.Integer(), nullable=False),
        sa.Column("tags", postgresql.JSONB(), nullable=False),
        sa.Column("strengths", postgresql.JSONB(), nullable=False),
        sa.Column("weaknesses", postgresql.JSONB(), nullable=False),
        sa.Column("missing_keywords", postgresql.JSONB(), nullable=False),
        sa.Column("suggested_improvement", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "keyword_match_score >= 0 AND keyword_match_score <= 100",
            name="ck_resume_keyword_match_score",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resume_versions_user_id", "resume_versions", ["user_id"])
    op.create_index("ix_resume_versions_user_updated", "resume_versions", ["user_id", "updated_at"])

    op.create_table(
        "coding_problems",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("difficulty", coding_difficulty, nullable=False),
        sa.Column("topic", sa.String(120), nullable=False),
        sa.Column("target_time_minutes", sa.Integer(), nullable=False),
        sa.Column("status", coding_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("link", sa.String(2048), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("target_time_minutes >= 5", name="ck_coding_target_time"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coding_problems_user_id", "coding_problems", ["user_id"])
    op.create_index("ix_coding_problems_user_status", "coding_problems", ["user_id", "status"])

    op.create_table(
        "behavioral_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("star_situation", sa.Text(), nullable=False),
        sa.Column("star_task", sa.Text(), nullable=False),
        sa.Column("star_action", sa.Text(), nullable=False),
        sa.Column("star_result", sa.Text(), nullable=False),
        sa.Column("confidence_score", sa.Integer(), nullable=False),
        sa.Column("status", behavioral_status, nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "confidence_score >= 1 AND confidence_score <= 5",
            name="ck_behavioral_confidence_score",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_behavioral_questions_user_id", "behavioral_questions", ["user_id"])
    op.create_index("ix_behavioral_questions_user_status", "behavioral_questions", ["user_id", "status"])

    op.create_table(
        "system_design_prompts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("concepts", postgresql.JSONB(), nullable=False),
        sa.Column("status", system_design_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_system_design_prompts_user_id", "system_design_prompts", ["user_id"])
    op.create_index("ix_system_design_prompts_user_status", "system_design_prompts", ["user_id", "status"])

    op.create_table(
        "analytics_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("metrics", postgresql.JSONB(), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "snapshot_date", "period", name="uq_analytics_snapshot_period"),
    )
    op.create_index("ix_analytics_snapshots_user_id", "analytics_snapshots", ["user_id"])
    op.create_index("ix_analytics_snapshots_user_date", "analytics_snapshots", ["user_id", "snapshot_date"])

    op.create_table(
        "user_settings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("theme", sa.String(20), nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False),
        *timestamps(),
        sa.CheckConstraint("theme IN ('dark', 'light', 'system')", name="ck_settings_theme"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_settings_user_id", "user_settings", ["user_id"])


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_table("analytics_snapshots")
    op.drop_table("system_design_prompts")
    op.drop_table("behavioral_questions")
    op.drop_table("coding_problems")
    op.drop_table("resume_versions")
    op.drop_table("applications")
    op.drop_table("users")
