"""Shipments: optional exporter_user_id for importer-owned export flows

Revision ID: a1b2c3d4e5f6
Revises: 9d5e4f3c2b11
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "9d5e4f3c2b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shipments",
        sa.Column("exporter_user_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_shipments_exporter_user_id",
        "shipments",
        ["exporter_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_shipments_exporter_user_id_users",
        "shipments",
        "users",
        ["exporter_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_shipments_exporter_user_id_users", "shipments", type_="foreignkey")
    op.drop_index("ix_shipments_exporter_user_id", table_name="shipments")
    op.drop_column("shipments", "exporter_user_id")
