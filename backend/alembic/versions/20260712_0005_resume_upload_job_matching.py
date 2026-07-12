"""Add resume upload and job matching fields.

Revision ID: 20260712_0005
Revises: 20260710_0004
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260712_0005"
down_revision: str | None = "20260710_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


json_list = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    resume_columns = {column["name"] for column in inspector.get_columns("resume_versions")}
    if "extracted_at" not in resume_columns:
        op.add_column("resume_versions", sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True))
    if "extraction_character_count" not in resume_columns:
        op.add_column(
            "resume_versions",
            sa.Column("extraction_character_count", sa.Integer(), nullable=False, server_default="0"),
        )

    analysis_columns = {column["name"] for column in inspector.get_columns("resume_analyses")}
    if "company_name" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("company_name", sa.String(200), nullable=False, server_default=""))
    if "input_resume_hash" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("input_resume_hash", sa.String(64), nullable=False, server_default=""))
    if "experience_match_score" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("experience_match_score", sa.Integer(), nullable=False, server_default="0"))
    if "required_skills_match" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("required_skills_match", json_list, nullable=False, server_default=_json_list_default(bind)))
    if "preferred_skills_match" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("preferred_skills_match", json_list, nullable=False, server_default=_json_list_default(bind)))
    if "recruiter_summary" not in analysis_columns:
        op.add_column("resume_analyses", sa.Column("recruiter_summary", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    pass


def _json_list_default(bind: sa.Connection) -> sa.TextClause:
    if bind.dialect.name == "postgresql":
        return sa.text("'[]'::jsonb")
    return sa.text("'[]'")
