"""Historique des rappels de rendez-vous.

Revision ID: 002
Revises: 001
Create Date: 2026-06-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "appointment_reminders",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("appointment_id", sa.Text(), nullable=False),
        sa.Column("channel", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("recipient", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.Text(), nullable=False),
        sa.Column("error", sa.Text()),
    )
    op.create_index("ix_appointment_reminders_appt", "appointment_reminders", ["appointment_id"])


def downgrade() -> None:
    op.drop_index("ix_appointment_reminders_appt", table_name="appointment_reminders")
    op.drop_table("appointment_reminders")
