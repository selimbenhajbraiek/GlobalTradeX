"""Shipments: forwarder_user_id (transitaire) for BI delay attribution

Revision ID: f6a7b8c9d0e1
Revises: b2c3d4e5f6a7
Create Date: 2026-05-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shipments",
        sa.Column("forwarder_user_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_shipments_forwarder_user_id",
        "shipments",
        ["forwarder_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_shipments_forwarder_user_id_users",
        "shipments",
        "users",
        ["forwarder_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_shipments_forwarder_user_id_users", "shipments", type_="foreignkey")
    op.drop_index("ix_shipments_forwarder_user_id", table_name="shipments")
    op.drop_column("shipments", "forwarder_user_id")
