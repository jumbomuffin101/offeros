"""Add Behavioral Coach intelligence and practice persistence."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260805_0021"
down_revision: str | None = "20260804_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _json_type():
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    for name, default in (
        ("competency_tags", "[]"),
        ("star_completeness_json", "{}"),
        ("latest_evaluation_json", "{}"),
        ("trend_summary_json", "{}"),
        ("observation_summary_json", "{}"),
    ):
        op.add_column("behavioral_questions", sa.Column(name, _json_type(), nullable=False, server_default=sa.text(f"'{default}'")))
    op.add_column("behavioral_questions", sa.Column("latest_evaluated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("behavioral_questions", sa.Column("evaluation_schema_version", sa.String(40), nullable=False, server_default="behavioral-evaluation-v1"))
    op.add_column("behavioral_questions", sa.Column("readiness_status", sa.String(40), nullable=False, server_default="draft"))
    op.add_column("behavioral_questions", sa.Column("career_context_version", sa.String(40), nullable=True))

    op.create_table(
        "behavioral_story_evaluations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("story_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("competency_focus", sa.String(80), nullable=True),
        sa.Column("evaluation_json", _json_type(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("comparison_json", _json_type(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("observation_summary_json", _json_type(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("career_context_version", sa.String(40), nullable=False, server_default="behavioral-context-v1"),
        sa.Column("schema_version", sa.String(40), nullable=False, server_default="behavioral-evaluation-v1"),
        sa.Column("provider", sa.String(80), nullable=False, server_default="deterministic"),
        sa.Column("model", sa.String(200), nullable=False, server_default="rules-v1"),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["story_id"], ["behavioral_questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_behavioral_story_evaluations_user_id", "behavioral_story_evaluations", ["user_id"])
    op.create_index("ix_behavioral_story_evaluations_story_id", "behavioral_story_evaluations", ["story_id"])
    op.create_index("ix_behavioral_story_evaluations_application_id", "behavioral_story_evaluations", ["application_id"])
    op.create_index("ix_behavioral_evaluations_user_story_created", "behavioral_story_evaluations", ["user_id", "story_id", "created_at"])
    op.create_index("ix_behavioral_evaluations_user_status", "behavioral_story_evaluations", ["user_id", "status"])

    op.create_table(
        "behavioral_practice_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("story_id", sa.Uuid(), nullable=True),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("competency", sa.String(80), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False, server_default=""),
        sa.Column("evaluation_json", _json_type(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["story_id"], ["behavioral_questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_behavioral_practice_sessions_user_id", "behavioral_practice_sessions", ["user_id"])
    op.create_index("ix_behavioral_practice_sessions_story_id", "behavioral_practice_sessions", ["story_id"])
    op.create_index("ix_behavioral_practice_sessions_application_id", "behavioral_practice_sessions", ["application_id"])
    op.create_index("ix_behavioral_practice_user_story_created", "behavioral_practice_sessions", ["user_id", "story_id", "created_at"])
    op.create_index("ix_behavioral_practice_user_status", "behavioral_practice_sessions", ["user_id", "status"])


def downgrade() -> None:
    op.drop_table("behavioral_practice_sessions")
    op.drop_table("behavioral_story_evaluations")
    for name in ("career_context_version", "readiness_status", "evaluation_schema_version", "latest_evaluated_at", "observation_summary_json", "trend_summary_json", "latest_evaluation_json", "star_completeness_json", "competency_tags"):
        op.drop_column("behavioral_questions", name)
