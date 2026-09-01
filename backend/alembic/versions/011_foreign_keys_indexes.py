"""Foreign keys et indexes utiles (PostgreSQL).

Revision ID: 011
Revises: 010
"""

from typing import Sequence, Union

from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"], unique=False)
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"], unique=False)
    op.create_index("ix_appointments_date", "appointments", ["date"], unique=False)
    op.create_index("ix_medical_visits_patient_id", "medical_visits", ["patient_id"], unique=False)
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"], unique=False)
    op.create_index("ix_patients_email", "patients", ["email"], unique=False)

    op.create_foreign_key(
        "fk_appointments_patient_id",
        "appointments",
        "patients",
        ["patient_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_appointments_doctor_id",
        "appointments",
        "doctors",
        ["doctor_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_medical_visits_patient_id",
        "medical_visits",
        "patients",
        ["patient_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_refresh_sessions_user_id",
        "refresh_sessions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_constraint("fk_refresh_sessions_user_id", "refresh_sessions", type_="foreignkey")
    op.drop_constraint("fk_medical_visits_patient_id", "medical_visits", type_="foreignkey")
    op.drop_constraint("fk_appointments_doctor_id", "appointments", type_="foreignkey")
    op.drop_constraint("fk_appointments_patient_id", "appointments", type_="foreignkey")
    op.drop_index("ix_patients_email", table_name="patients")
    op.drop_index("ix_refresh_sessions_user_id", table_name="refresh_sessions")
    op.drop_index("ix_medical_visits_patient_id", table_name="medical_visits")
    op.drop_index("ix_appointments_date", table_name="appointments")
    op.drop_index("ix_appointments_doctor_id", table_name="appointments")
    op.drop_index("ix_appointments_patient_id", table_name="appointments")
