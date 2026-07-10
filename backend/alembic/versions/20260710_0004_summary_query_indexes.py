"""Add indexes for workspace summary queries.

Revision ID: 20260710_0004
Revises: 20260707_0003
"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import inspect


revision: str = "20260710_0004"
down_revision: str | None = "20260707_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SUMMARY_INDEXES = (
    ("applications", "ix_applications_user_deleted_updated", ["user_id", "deleted_at", "updated_at"]),
    ("applications", "ix_applications_user_deleted_deadline", ["user_id", "deleted_at", "deadline"]),
    ("resume_versions", "ix_resume_versions_user_deleted_updated", ["user_id", "deleted_at", "updated_at"]),
    ("coding_problems", "ix_coding_problems_user_deleted_updated", ["user_id", "deleted_at", "updated_at"]),
    ("behavioral_questions", "ix_behavioral_questions_user_deleted_updated", ["user_id", "deleted_at", "updated_at"]),
    ("system_design_prompts", "ix_system_design_prompts_user_deleted_updated", ["user_id", "deleted_at", "updated_at"]),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    for table_name, index_name, columns in SUMMARY_INDEXES:
        if table_name not in tables:
            continue
        existing = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name not in existing:
            op.create_index(index_name, table_name, columns)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    for table_name, index_name, _columns in reversed(SUMMARY_INDEXES):
        if table_name not in tables:
            continue
        existing = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name in existing:
            op.drop_index(index_name, table_name=table_name)
