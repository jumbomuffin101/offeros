"""Add latest resume analysis summary fields.

Revision ID: 20260713_0006
Revises: 20260712_0005
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260713_0006"
down_revision: str | None = "20260712_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("resume_versions")}
    if "last_analyzed_at" not in columns:
        op.add_column("resume_versions", sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True))
    if "latest_analysis_id" not in columns:
        op.add_column("resume_versions", sa.Column("latest_analysis_id", sa.Uuid(), nullable=True))
    if "latest_overall_score" not in columns:
        op.add_column("resume_versions", sa.Column("latest_overall_score", sa.Integer(), nullable=True))
    if "latest_analysis_target_role" not in columns:
        op.add_column("resume_versions", sa.Column("latest_analysis_target_role", sa.String(length=200), nullable=False, server_default=""))
    if "latest_analysis_company" not in columns:
        op.add_column("resume_versions", sa.Column("latest_analysis_company", sa.String(length=200), nullable=False, server_default=""))
    if "analysis_status" not in columns:
        op.add_column("resume_versions", sa.Column("analysis_status", sa.String(length=40), nullable=False, server_default=""))


def downgrade() -> None:
    pass
