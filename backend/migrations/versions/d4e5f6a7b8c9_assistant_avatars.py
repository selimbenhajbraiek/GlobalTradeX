"""Assistant avatars for admin-driven video assistant

Revision ID: d4e5f6a7b8c9
Revises: f1a2b3c4d5e6
Create Date: 2026-05-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistant_avatars",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("video_path", sa.String(length=1024), nullable=False),
        sa.Column("video_size", sa.Integer(), nullable=False),
        sa.Column("public_token", sa.String(length=64), nullable=False),
        sa.Column("presenter_source_url", sa.String(length=2048), nullable=True),
        sa.Column("avatar_provider_id", sa.String(length=255), nullable=True),
        sa.Column("voice_id", sa.String(length=255), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="not_created",
        ),
        sa.Column("persona", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_token"),
    )
    op.create_index("ix_assistant_avatars_admin_id", "assistant_avatars", ["admin_id"])
    op.create_index("ix_assistant_avatars_is_active", "assistant_avatars", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_assistant_avatars_is_active", table_name="assistant_avatars")
    op.drop_index("ix_assistant_avatars_admin_id", table_name="assistant_avatars")
    op.drop_table("assistant_avatars")
