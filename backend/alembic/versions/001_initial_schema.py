"""Schéma initial SIH IA.

Revision ID: 001
Revises:
Create Date: 2026-05-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("facility", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "patients",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("record_number", sa.Text(), nullable=False),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("dob", sa.Text(), nullable=False),
        sa.Column("gender", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text()),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("blood_type", sa.Text(), nullable=False),
        sa.Column("allergies", sa.Text(), nullable=False),
        sa.Column("insurance", sa.Text()),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("last_visit", sa.Text()),
        sa.UniqueConstraint("record_number", name="uq_patients_record_number"),
    )
    op.create_table(
        "doctors",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("specialty", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("availability", sa.Text(), nullable=False),
        sa.Column("patients_count", sa.Integer(), nullable=False),
        sa.Column("weekly_appointments", sa.Integer(), nullable=False),
        sa.Column("satisfaction", sa.Float(), nullable=False),
        sa.Column("schedule", sa.Text(), nullable=False),
    )
    op.create_table(
        "appointments",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("patient_id", sa.Text(), nullable=False),
        sa.Column("patient_name", sa.Text(), nullable=False),
        sa.Column("doctor_id", sa.Text(), nullable=False),
        sa.Column("doctor_name", sa.Text(), nullable=False),
        sa.Column("date", sa.Text(), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
    )
    op.create_table(
        "medical_visits",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("patient_id", sa.Text(), nullable=False),
        sa.Column("date", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("doctor_name", sa.Text(), nullable=False),
        sa.Column("specialty", sa.Text(), nullable=False),
        sa.Column("diagnosis", sa.Text(), nullable=False),
        sa.Column("treatment", sa.Text()),
        sa.Column("notes", sa.Text()),
    )
    op.create_table(
        "refresh_sessions",
        sa.Column("session_id", sa.Text(), primary_key=True),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("expires_at_ts", sa.Integer(), nullable=False),
        sa.Column("revoked", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("refresh_sessions")
    op.drop_table("medical_visits")
    op.drop_table("appointments")
    op.drop_table("doctors")
    op.drop_table("patients")
    op.drop_table("users")
