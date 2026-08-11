"""Add a deterministic creation order to refresh sessions.

Revision ID: 009
Revises: 008
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "refresh_sessions",
        sa.Column("created_at_ns", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_refresh_sessions_user_creation",
        "refresh_sessions",
        ["user_id", "created_at_ns"],
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_sessions_user_creation", table_name="refresh_sessions")
    op.drop_column("refresh_sessions", "created_at_ns")
