"""message threads, messages, user notification_preferences

Revision ID: a9b8c7d6e5f4
Revises: e5f6a7b8c9d0
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a9b8c7d6e5f4"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("notification_preferences", sa.JSON(), nullable=True),
    )
    op.create_table(
        "message_threads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("shipment_id", sa.Integer(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_message_threads_shipment_id"), "message_threads", ["shipment_id"], unique=False)
    op.create_table(
        "thread_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["thread_id"], ["message_threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("thread_id", "user_id", name="uq_thread_participant"),
    )
    op.create_index(op.f("ix_thread_participants_thread_id"), "thread_participants", ["thread_id"], unique=False)
    op.create_index(op.f("ix_thread_participants_user_id"), "thread_participants", ["user_id"], unique=False)
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thread_id"], ["message_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_thread_id"), "messages", ["thread_id"], unique=False)
    op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_thread_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_index(op.f("ix_thread_participants_user_id"), table_name="thread_participants")
    op.drop_index(op.f("ix_thread_participants_thread_id"), table_name="thread_participants")
    op.drop_table("thread_participants")
    op.drop_index(op.f("ix_message_threads_shipment_id"), table_name="message_threads")
    op.drop_table("message_threads")
    op.drop_column("users", "notification_preferences")
