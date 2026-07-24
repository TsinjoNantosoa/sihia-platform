"""Add users.last_login for RBAC last connection display.

Revision ID: 005
Revises: 004
Create Date: 2026-07-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_login", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_login")
