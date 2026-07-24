"""Add persistent AI mock interview sessions."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260724_0015"
down_revision: str | None = "20260723_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mock_interview_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("resume_version_id", sa.Uuid(), nullable=True),
        sa.Column("interview_type", sa.String(40), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("difficulty", sa.String(30), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("target_role", sa.String(200), nullable=False),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("question_count", sa.Integer(), nullable=False),
        sa.Column("current_question_index", sa.Integer(), nullable=False),
        sa.Column("current_follow_up_count", sa.Integer(), nullable=False),
        sa.Column("context_sources", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("model", sa.String(160), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["applications.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["resume_version_id"], ["resume_versions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_mock_interview_sessions_user_id",
        "mock_interview_sessions",
        ["user_id"],
    )
    op.create_index(
        "ix_mock_interview_sessions_application_id",
        "mock_interview_sessions",
        ["application_id"],
    )
    op.create_index(
        "ix_mock_interview_sessions_resume_version_id",
        "mock_interview_sessions",
        ["resume_version_id"],
    )
    op.create_index(
        "ix_mock_interview_sessions_status",
        "mock_interview_sessions",
        ["status"],
    )
    op.create_index(
        "ix_mock_interview_sessions_user_updated",
        "mock_interview_sessions",
        ["user_id", "updated_at"],
    )

    op.create_table(
        "mock_interview_turns",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False),
        sa.Column("speaker", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(40), nullable=True),
        sa.Column("evaluation_json", sa.JSON(), nullable=True),
        sa.Column("answer_request_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["session_id"], ["mock_interview_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id",
            "turn_index",
            name="uq_mock_interview_turn_index",
        ),
        sa.UniqueConstraint(
            "session_id",
            "answer_request_id",
            name="uq_mock_interview_answer_request",
        ),
    )
    op.create_index(
        "ix_mock_interview_turns_session_id",
        "mock_interview_turns",
        ["session_id"],
    )
    op.create_index(
        "ix_mock_interview_turns_session_created",
        "mock_interview_turns",
        ["session_id", "created_at"],
    )

    op.create_table(
        "mock_interview_scorecards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("communication_score", sa.Integer(), nullable=False),
        sa.Column("technical_accuracy_score", sa.Integer(), nullable=False),
        sa.Column("structure_score", sa.Integer(), nullable=False),
        sa.Column("depth_score", sa.Integer(), nullable=False),
        sa.Column("relevance_score", sa.Integer(), nullable=False),
        sa.Column("behavioral_score", sa.Integer(), nullable=True),
        sa.Column("resume_fluency_score", sa.Integer(), nullable=True),
        sa.Column("system_design_score", sa.Integer(), nullable=True),
        sa.Column("technical_reasoning_score", sa.Integer(), nullable=True),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("weaknesses", sa.JSON(), nullable=False),
        sa.Column("missed_points", sa.JSON(), nullable=False),
        sa.Column("strongest_answer", sa.Text(), nullable=False),
        sa.Column("weakest_answer", sa.Text(), nullable=False),
        sa.Column("recommended_actions", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["mock_interview_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index(
        "ix_mock_interview_scorecards_session_id",
        "mock_interview_scorecards",
        ["session_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mock_interview_scorecards_session_id",
        table_name="mock_interview_scorecards",
    )
    op.drop_table("mock_interview_scorecards")
    op.drop_index(
        "ix_mock_interview_turns_session_created",
        table_name="mock_interview_turns",
    )
    op.drop_index(
        "ix_mock_interview_turns_session_id",
        table_name="mock_interview_turns",
    )
    op.drop_table("mock_interview_turns")
    op.drop_index(
        "ix_mock_interview_sessions_user_updated",
        table_name="mock_interview_sessions",
    )
    op.drop_index(
        "ix_mock_interview_sessions_status",
        table_name="mock_interview_sessions",
    )
    op.drop_index(
        "ix_mock_interview_sessions_resume_version_id",
        table_name="mock_interview_sessions",
    )
    op.drop_index(
        "ix_mock_interview_sessions_application_id",
        table_name="mock_interview_sessions",
    )
    op.drop_index(
        "ix_mock_interview_sessions_user_id",
        table_name="mock_interview_sessions",
    )
    op.drop_table("mock_interview_sessions")
