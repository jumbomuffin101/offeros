"""Add deterministic application attention overrides."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260723_0014"
down_revision: str | None = "20260723_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("meaningful_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE applications SET meaningful_updated_at = "
        "COALESCE(updated_at, created_at) WHERE meaningful_updated_at IS NULL"
    )
    op.create_index(
        "ix_applications_meaningful_updated_at",
        "applications",
        ["meaningful_updated_at"],
    )
    op.create_table(
        "application_attention_overrides",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(60), nullable=False),
        sa.Column("signal_key", sa.String(64), nullable=False),
        sa.Column("dismissed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "application_id",
            "category",
            name="uq_application_attention_override_signal",
        ),
    )
    op.create_index(
        "ix_application_attention_overrides_user_id",
        "application_attention_overrides",
        ["user_id"],
    )
    op.create_index(
        "ix_application_attention_overrides_application_id",
        "application_attention_overrides",
        ["application_id"],
    )
    op.create_index(
        "ix_application_attention_overrides_user_until",
        "application_attention_overrides",
        ["user_id", "dismissed_until"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_application_attention_overrides_user_until",
        table_name="application_attention_overrides",
    )
    op.drop_index(
        "ix_application_attention_overrides_application_id",
        table_name="application_attention_overrides",
    )
    op.drop_index(
        "ix_application_attention_overrides_user_id",
        table_name="application_attention_overrides",
    )
    op.drop_table("application_attention_overrides")
    op.drop_index("ix_applications_meaningful_updated_at", table_name="applications")
    op.drop_column("applications", "meaningful_updated_at")
