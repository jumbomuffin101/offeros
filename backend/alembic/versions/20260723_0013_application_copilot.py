"""Add application recruiter copilot conversations."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260723_0013"
down_revision: str | None = "20260722_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "application_copilot_conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_application_copilot_conversations_user_id",
        "application_copilot_conversations",
        ["user_id"],
    )
    op.create_index(
        "ix_application_copilot_conversations_application_id",
        "application_copilot_conversations",
        ["application_id"],
    )
    op.create_index(
        "ix_application_copilot_conversations_user_application_updated",
        "application_copilot_conversations",
        ["user_id", "application_id", "updated_at"],
    )

    op.create_table(
        "application_copilot_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(80), server_default="", nullable=False),
        sa.Column("model", sa.String(160), server_default="", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["application_copilot_conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_application_copilot_messages_conversation_id",
        "application_copilot_messages",
        ["conversation_id"],
    )
    op.create_index(
        "ix_application_copilot_messages_conversation_created",
        "application_copilot_messages",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_application_copilot_messages_conversation_created",
        table_name="application_copilot_messages",
    )
    op.drop_index(
        "ix_application_copilot_messages_conversation_id",
        table_name="application_copilot_messages",
    )
    op.drop_table("application_copilot_messages")
    op.drop_index(
        "ix_application_copilot_conversations_user_application_updated",
        table_name="application_copilot_conversations",
    )
    op.drop_index(
        "ix_application_copilot_conversations_application_id",
        table_name="application_copilot_conversations",
    )
    op.drop_index(
        "ix_application_copilot_conversations_user_id",
        table_name="application_copilot_conversations",
    )
    op.drop_table("application_copilot_conversations")
