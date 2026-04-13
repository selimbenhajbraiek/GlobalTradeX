"""Fix truncated document file_type values after VARCHAR widen

Revision ID: c5e6f7a8b9d0
Revises: b3c4d5e6f7a8
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op

revision: str = "c5e6f7a8b9d0"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    fixes = (
        ("commercial_invoice", "commercial_%"),
        ("packing_list", "packing_%"),
        ("certificate_of_origin", "certificate_%"),
        ("bill_of_lading", "bill_of_%"),
    )
    for full, like in fixes:
        op.execute(
            f"UPDATE documents SET file_type = '{full}' "
            f"WHERE file_type LIKE '{like}' AND file_type != '{full}'"
        )


def downgrade() -> None:
    pass
