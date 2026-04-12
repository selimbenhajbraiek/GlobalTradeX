"""shipment_products table; shipments currency and freight_estimate_usd

Revision ID: 7b2c1d4e5f60
Revises: 6a03d7b6abc9
Create Date: 2026-04-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7b2c1d4e5f60"
down_revision: Union[str, Sequence[str], None] = "6a03d7b6abc9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shipments",
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
    )
    op.add_column(
        "shipments",
        sa.Column("freight_estimate_usd", sa.Numeric(15, 2), nullable=True),
    )
    op.create_table(
        "shipment_products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("shipment_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("shipment_id", "product_id", name="uq_shipment_product"),
    )
    op.create_index(op.f("ix_shipment_products_shipment_id"), "shipment_products", ["shipment_id"])
    op.create_index(op.f("ix_shipment_products_product_id"), "shipment_products", ["product_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_shipment_products_product_id"), table_name="shipment_products")
    op.drop_index(op.f("ix_shipment_products_shipment_id"), table_name="shipment_products")
    op.drop_table("shipment_products")
    op.drop_column("shipments", "freight_estimate_usd")
    op.drop_column("shipments", "currency")
