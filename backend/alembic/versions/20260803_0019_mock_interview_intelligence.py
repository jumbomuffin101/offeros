"""Add Career Intelligence summaries to mock interviews."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260803_0019"
down_revision: str | None = "20260730_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _json_type():
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column("mock_interview_sessions", sa.Column("career_context_version", sa.String(60), nullable=False, server_default=""))
    op.add_column("mock_interview_sessions", sa.Column("career_context_json", _json_type(), nullable=False, server_default=sa.text("'{}'")))
    op.add_column("mock_interview_sessions", sa.Column("question_plan_json", _json_type(), nullable=False, server_default=sa.text("'{}'")))
    op.add_column("mock_interview_sessions", sa.Column("trend_delta_json", _json_type(), nullable=False, server_default=sa.text("'{}'")))
    op.add_column("mock_interview_sessions", sa.Column("observation_summary_json", _json_type(), nullable=False, server_default=sa.text("'[]'")))
    op.add_column("mock_interview_sessions", sa.Column("intelligence_status", sa.String(30), nullable=False, server_default="unavailable"))


def downgrade() -> None:
    op.drop_column("mock_interview_sessions", "intelligence_status")
    op.drop_column("mock_interview_sessions", "observation_summary_json")
    op.drop_column("mock_interview_sessions", "trend_delta_json")
    op.drop_column("mock_interview_sessions", "question_plan_json")
    op.drop_column("mock_interview_sessions", "career_context_json")
    op.drop_column("mock_interview_sessions", "career_context_version")
