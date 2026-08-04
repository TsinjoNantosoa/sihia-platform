"""Documents patient et champs dossier enrichi.

Revision ID: 007
Revises: 006
Create Date: 2026-08-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("chronic_conditions", sa.Text(), nullable=True))
    op.add_column("patients", sa.Column("current_treatments", sa.Text(), nullable=True))
    op.add_column("patients", sa.Column("emergency_contact", sa.Text(), nullable=True))

    op.create_table(
        "patient_documents",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("patient_id", sa.Text(), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False, server_default="other"),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("uploaded_by", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_patient_documents_patient", "patient_documents", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_patient_documents_patient", table_name="patient_documents")
    op.drop_table("patient_documents")
    op.drop_column("patients", "emergency_contact")
    op.drop_column("patients", "current_treatments")
    op.drop_column("patients", "chronic_conditions")
