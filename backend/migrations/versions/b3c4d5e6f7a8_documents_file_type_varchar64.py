"""Documents: widen file_type for full trade enum string values (MySQL)

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ALLOWED = (
    "commercial_invoice",
    "packing_list",
    "certificate_of_origin",
    "bill_of_lading",
    "customs_declaration",
    "other",
)


def upgrade() -> None:
    op.execute("ALTER TABLE documents MODIFY COLUMN file_type VARCHAR(64) NOT NULL")
    # Repair values truncated while the column was narrow (before widen).
    op.execute(
        "UPDATE documents SET file_type = 'commercial_invoice' "
        "WHERE file_type LIKE 'commercial_%' AND file_type != 'commercial_invoice'"
    )
    op.execute(
        "UPDATE documents SET file_type = 'packing_list' "
        "WHERE file_type LIKE 'packing_%' AND file_type != 'packing_list'"
    )
    op.execute(
        "UPDATE documents SET file_type = 'certificate_of_origin' "
        "WHERE file_type LIKE 'certificate_%' AND file_type != 'certificate_of_origin'"
    )
    op.execute(
        "UPDATE documents SET file_type = 'bill_of_lading' "
        "WHERE file_type LIKE 'bill_of_%' AND file_type != 'bill_of_lading'"
    )
    in_list = ", ".join(f"'{v}'" for v in _ALLOWED)
    op.execute(f"UPDATE documents SET file_type = 'other' WHERE file_type NOT IN ({in_list})")


def downgrade() -> None:
    op.execute("UPDATE documents SET file_type = 'other' WHERE LENGTH(file_type) > 32")
    op.execute("ALTER TABLE documents MODIFY COLUMN file_type VARCHAR(32) NOT NULL")
