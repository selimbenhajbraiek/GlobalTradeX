"""Shipments: vessel_name, voyage_number, eta_update for freight ops

Revision ID: 9d5e4f3c2b11
Revises: 8c4d3e2a1b00
Create Date: 2026-04-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9d5e4f3c2b11"
down_revision: Union[str, Sequence[str], None] = "8c4d3e2a1b00"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shipments", sa.Column("vessel_name", sa.String(length=200), nullable=True))
    op.add_column("shipments", sa.Column("voyage_number", sa.String(length=100), nullable=True))
    op.add_column("shipments", sa.Column("eta_update", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("shipments", "eta_update")
    op.drop_column("shipments", "voyage_number")
    op.drop_column("shipments", "vessel_name")
