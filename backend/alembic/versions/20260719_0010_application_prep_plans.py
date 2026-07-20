"""Add persisted application prep plans."""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20260719_0010"
down_revision: str | None = "20260718_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table("application_prep_plans", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False), sa.Column("application_id", sa.Uuid(), nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("coding", sa.JSON(), nullable=False), sa.Column("behavioral", sa.JSON(), nullable=False), sa.Column("system_design", sa.JSON(), nullable=False), sa.Column("overall_preparation_summary", sa.Text(), nullable=False), sa.Column("next_best_action", sa.Text(), nullable=False), sa.Column("source_job_description", sa.Text(), nullable=False), sa.Column("source_resume_analysis_id", sa.Uuid(), nullable=True), sa.Column("provider", sa.String(80), nullable=False), sa.Column("model", sa.String(120), nullable=False), sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("application_id", name="uq_application_prep_plan_application"))
    op.create_index("ix_application_prep_plans_user_id", "application_prep_plans", ["user_id"])
    op.create_index("ix_application_prep_plans_application_id", "application_prep_plans", ["application_id"])

def downgrade() -> None: op.drop_table("application_prep_plans")
