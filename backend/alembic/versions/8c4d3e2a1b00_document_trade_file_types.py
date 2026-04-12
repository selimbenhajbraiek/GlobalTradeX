"""Documents: normalize file_type to trade document enum values

Revision ID: 8c4d3e2a1b00
Revises: 7b2c1d4e5f60
Create Date: 2026-04-12

"""

from typing import Sequence, Union

from alembic import op

revision: str = "8c4d3e2a1b00"
down_revision: Union[str, Sequence[str], None] = "7b2c1d4e5f60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE documents
        SET file_type = 'other'
        WHERE file_type NOT IN (
            'commercial_invoice',
            'packing_list',
            'certificate_of_origin',
            'bill_of_lading',
            'customs_declaration',
            'other'
        )
        """
    )


def downgrade() -> None:
    pass
