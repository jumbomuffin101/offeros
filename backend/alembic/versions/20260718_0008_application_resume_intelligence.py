"""Link applications to saved resumes and job-specific analyses.

Revision ID: 20260718_0008
Revises: 20260715_0007
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260718_0008"
down_revision: str | None = "20260715_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("applications")}
    if "resume_version_id" not in columns:
        op.add_column("applications", sa.Column("resume_version_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            "fk_applications_resume_version_id", "applications", "resume_versions",
            ["resume_version_id"], ["id"], ondelete="SET NULL",
        )
        op.create_index("ix_applications_resume_version_id", "applications", ["resume_version_id"])
    if "resume_analysis_id" not in columns:
        op.add_column("applications", sa.Column("resume_analysis_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            "fk_applications_resume_analysis_id", "applications", "resume_analyses",
            ["resume_analysis_id"], ["id"], ondelete="SET NULL",
        )
        op.create_index("ix_applications_resume_analysis_id", "applications", ["resume_analysis_id"])
    if "job_description" not in columns:
        op.add_column("applications", sa.Column("job_description", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("applications", "job_description")
    op.drop_index("ix_applications_resume_analysis_id", table_name="applications")
    op.drop_constraint("fk_applications_resume_analysis_id", "applications", type_="foreignkey")
    op.drop_column("applications", "resume_analysis_id")
    op.drop_index("ix_applications_resume_version_id", table_name="applications")
    op.drop_constraint("fk_applications_resume_version_id", "applications", type_="foreignkey")
    op.drop_column("applications", "resume_version_id")
