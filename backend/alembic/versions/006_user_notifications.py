"""Préférences notifications et état lu/non lu par utilisateur.

Revision ID: 006
Revises: 005
Create Date: 2026-08-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_notification_reads",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("alert_id", sa.Text(), nullable=False),
        sa.Column("read_at", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "alert_id"),
    )
    op.create_index("ix_user_notification_reads_user", "user_notification_reads", ["user_id"])

    op.create_table(
        "user_notification_prefs",
        sa.Column("user_id", sa.Text(), primary_key=True),
        sa.Column("alerts_enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reminders_enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("weekly_digest_enabled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_notification_prefs")
    op.drop_index("ix_user_notification_reads_user", table_name="user_notification_reads")
    op.drop_table("user_notification_reads")
