"""Add persistent career intelligence observations."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260730_0018"
down_revision: str | None = "20260727_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "career_observations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("dedupe_key", sa.String(180), nullable=False),
        sa.Column("observation_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_ids_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("evidence_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("first_observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_career_observations_user_id", "career_observations", ["user_id"])
    op.create_index("ix_career_observations_user_status", "career_observations", ["user_id", "status"])
    op.create_index(
        "ix_career_observations_user_type_confirmed",
        "career_observations",
        ["user_id", "observation_type", "last_confirmed_at"],
    )
    op.create_index(
        "uq_career_observations_user_key",
        "career_observations",
        ["user_id", "dedupe_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("career_observations")
