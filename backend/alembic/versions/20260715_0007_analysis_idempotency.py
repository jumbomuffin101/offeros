"""Add an idempotency key for resume analysis requests.

Revision ID: 20260715_0007
Revises: 20260713_0006
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260715_0007"
down_revision: str | None = "20260713_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("resume_analyses")}
    indexes = {index["name"] for index in inspector.get_indexes("resume_analyses")}
    if "analysis_request_id" not in columns:
        op.add_column("resume_analyses", sa.Column("analysis_request_id", sa.Uuid(), nullable=True))
    if "uq_resume_analyses_user_request" not in indexes:
        op.create_index(
            "uq_resume_analyses_user_request",
            "resume_analyses",
            ["user_id", "analysis_request_id"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("uq_resume_analyses_user_request", table_name="resume_analyses")
    op.drop_column("resume_analyses", "analysis_request_id")
