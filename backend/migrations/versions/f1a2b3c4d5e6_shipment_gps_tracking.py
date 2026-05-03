"""Shipments: simulated GPS tracking fields

Revision ID: f1a2b3c4d5e6
Revises: c5e6f7a8b9d0
Create Date: 2026-05-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c5e6f7a8b9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shipments", sa.Column("origin_lat", sa.Float(), nullable=True))
    op.add_column("shipments", sa.Column("origin_lng", sa.Float(), nullable=True))
    op.add_column("shipments", sa.Column("dest_lat", sa.Float(), nullable=True))
    op.add_column("shipments", sa.Column("dest_lng", sa.Float(), nullable=True))
    op.add_column("shipments", sa.Column("current_lat", sa.Float(), nullable=True))
    op.add_column("shipments", sa.Column("current_lng", sa.Float(), nullable=True))
    op.add_column(
        "shipments",
        sa.Column("tracking_status", sa.String(length=32), nullable=False, server_default="pending"),
    )
    op.add_column(
        "shipments",
        sa.Column("tracking_progress", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column("shipments", sa.Column("location_history", sa.JSON(), nullable=True))
    op.add_column("shipments", sa.Column("estimated_delivery_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "shipments",
        sa.Column("simulation_state", sa.String(length=20), nullable=False, server_default="idle"),
    )


def downgrade() -> None:
    op.drop_column("shipments", "simulation_state")
    op.drop_column("shipments", "estimated_delivery_at")
    op.drop_column("shipments", "location_history")
    op.drop_column("shipments", "tracking_progress")
    op.drop_column("shipments", "tracking_status")
    op.drop_column("shipments", "current_lng")
    op.drop_column("shipments", "current_lat")
    op.drop_column("shipments", "dest_lng")
    op.drop_column("shipments", "dest_lat")
    op.drop_column("shipments", "origin_lng")
    op.drop_column("shipments", "origin_lat")
