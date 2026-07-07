"""Repair resume schema drift.

Revision ID: 20260707_0003
Revises: 20260706_0002
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260707_0003"
down_revision: str | None = "20260706_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


json_list = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    resume_columns = {column["name"] for column in inspector.get_columns("resume_versions")}

    if "original_file_name" not in resume_columns:
        op.add_column(
            "resume_versions",
            sa.Column("original_file_name", sa.String(500), nullable=False, server_default=""),
        )
    if "extracted_text" not in resume_columns:
        op.add_column(
            "resume_versions",
            sa.Column("extracted_text", sa.Text(), nullable=False, server_default=""),
        )
    if "text_extraction_status" not in resume_columns:
        op.add_column(
            "resume_versions",
            sa.Column("text_extraction_status", sa.String(40), nullable=False, server_default="not_started"),
        )
    if "text_extraction_error" not in resume_columns:
        op.add_column(
            "resume_versions",
            sa.Column("text_extraction_error", sa.Text(), nullable=False, server_default=""),
        )

    tables = set(inspector.get_table_names())
    if "resume_analyses" not in tables:
        op.create_table(
            "resume_analyses",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("resume_version_id", sa.Uuid(), nullable=False),
            sa.Column("target_role", sa.String(200), nullable=False),
            sa.Column("job_description", sa.Text(), nullable=False, server_default=""),
            sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("keyword_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("impact_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("clarity_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("technical_depth_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("missing_keywords", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("strong_keywords", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("weak_bullets", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("suggested_bullet_rewrites", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("strengths", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("risks", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("recommendations", json_list, nullable=False, server_default=_json_list_default(bind)),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("provider", sa.String(80), nullable=False, server_default="mock"),
            sa.Column("model", sa.String(120), nullable=False, server_default="local-mock"),
            sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
            sa.Column("error_message", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["resume_version_id"], ["resume_versions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("resume_analyses")}
    if "ix_resume_analyses_user_id" not in indexes:
        op.create_index("ix_resume_analyses_user_id", "resume_analyses", ["user_id"])
    if "ix_resume_analyses_resume_version_id" not in indexes:
        op.create_index("ix_resume_analyses_resume_version_id", "resume_analyses", ["resume_version_id"])
    if "ix_resume_analyses_user_resume_updated" not in indexes:
        op.create_index(
            "ix_resume_analyses_user_resume_updated",
            "resume_analyses",
            ["user_id", "resume_version_id", "updated_at"],
        )


def downgrade() -> None:
    pass


def _json_list_default(bind: sa.Connection) -> sa.TextClause:
    if bind.dialect.name == "postgresql":
        return sa.text("'[]'::jsonb")
    return sa.text("'[]'")
