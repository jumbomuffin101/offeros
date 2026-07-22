"""Add application capture metadata and defaults."""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20260722_0011"
down_revision: str | None = "20260719_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.add_column("applications", sa.Column("external_job_id", sa.String(255), nullable=True))
    op.add_column("applications", sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_applications_user_external_job", "applications", ["user_id", "source", "external_job_id"])
    op.add_column("user_settings", sa.Column("default_resume_version_id", sa.Uuid(), nullable=True))
    op.add_column("user_settings", sa.Column("default_run_resume_analysis", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("user_settings", sa.Column("default_generate_prep_plan", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("user_settings", sa.Column("default_application_status", sa.String(30), server_default="wishlist", nullable=False))

def downgrade() -> None:
    op.drop_column("user_settings", "default_application_status")
    op.drop_column("user_settings", "default_generate_prep_plan")
    op.drop_column("user_settings", "default_run_resume_analysis")
    op.drop_column("user_settings", "default_resume_version_id")
    op.drop_index("ix_applications_user_external_job", table_name="applications")
    op.drop_column("applications", "captured_at")
    op.drop_column("applications", "external_job_id")
