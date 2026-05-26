"""
Copie les données de app.db (SQLite) vers PostgreSQL.

Usage (depuis backend/) :
  set DATABASE_URL=postgresql://sihia:sihia@localhost:5434/sihia
  python scripts/migrate_sqlite_to_postgres.py

Docker :
  docker compose run --rm -v ./backend/app.db:/app/app.db:ro backend \\
    python scripts/migrate_sqlite_to_postgres.py
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

# backend/ sur sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.infrastructure.database import get_engine, is_postgresql, reset_engine, sqlalchemy_url

SQLITE_PATH = Path(os.getenv("SQLITE_PATH", "app.db"))
BATCH = 200

TABLES: list[tuple[str, list[str], str]] = [
    (
        "users",
        ["id", "name", "email", "password", "role", "facility", "status"],
        """
        INSERT INTO users (id, name, email, password, role, facility, status)
        VALUES (:id, :name, :email, :password, :role, :facility, :status)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            facility = EXCLUDED.facility,
            status = EXCLUDED.status
        """,
    ),
    (
        "doctors",
        [
            "id",
            "first_name",
            "last_name",
            "specialty",
            "phone",
            "email",
            "availability",
            "patients_count",
            "weekly_appointments",
            "satisfaction",
            "schedule",
        ],
        """
        INSERT INTO doctors (
            id, first_name, last_name, specialty, phone, email, availability,
            patients_count, weekly_appointments, satisfaction, schedule
        ) VALUES (
            :id, :first_name, :last_name, :specialty, :phone, :email, :availability,
            :patients_count, :weekly_appointments, :satisfaction, :schedule
        )
        ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            specialty = EXCLUDED.specialty,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            availability = EXCLUDED.availability,
            patients_count = EXCLUDED.patients_count,
            weekly_appointments = EXCLUDED.weekly_appointments,
            satisfaction = EXCLUDED.satisfaction,
            schedule = EXCLUDED.schedule
        """,
    ),
    (
        "patients",
        [
            "id",
            "record_number",
            "first_name",
            "last_name",
            "dob",
            "gender",
            "phone",
            "email",
            "address",
            "blood_type",
            "allergies",
            "insurance",
            "status",
            "last_visit",
        ],
        """
        INSERT INTO patients (
            id, record_number, first_name, last_name, dob, gender, phone, email,
            address, blood_type, allergies, insurance, status, last_visit
        ) VALUES (
            :id, :record_number, :first_name, :last_name, :dob, :gender, :phone, :email,
            :address, :blood_type, :allergies, :insurance, :status, :last_visit
        )
        ON CONFLICT (id) DO UPDATE SET
            record_number = EXCLUDED.record_number,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            dob = EXCLUDED.dob,
            gender = EXCLUDED.gender,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            blood_type = EXCLUDED.blood_type,
            allergies = EXCLUDED.allergies,
            insurance = EXCLUDED.insurance,
            status = EXCLUDED.status,
            last_visit = EXCLUDED.last_visit
        """,
    ),
    (
        "appointments",
        [
            "id",
            "patient_id",
            "patient_name",
            "doctor_id",
            "doctor_name",
            "date",
            "duration_min",
            "reason",
            "status",
        ],
        """
        INSERT INTO appointments (
            id, patient_id, patient_name, doctor_id, doctor_name,
            date, duration_min, reason, status
        ) VALUES (
            :id, :patient_id, :patient_name, :doctor_id, :doctor_name,
            :date, :duration_min, :reason, :status
        )
        ON CONFLICT (id) DO UPDATE SET
            patient_id = EXCLUDED.patient_id,
            patient_name = EXCLUDED.patient_name,
            doctor_id = EXCLUDED.doctor_id,
            doctor_name = EXCLUDED.doctor_name,
            date = EXCLUDED.date,
            duration_min = EXCLUDED.duration_min,
            reason = EXCLUDED.reason,
            status = EXCLUDED.status
        """,
    ),
    (
        "medical_visits",
        [
            "id",
            "patient_id",
            "date",
            "reason",
            "doctor_name",
            "specialty",
            "diagnosis",
            "treatment",
            "notes",
        ],
        """
        INSERT INTO medical_visits (
            id, patient_id, date, reason, doctor_name, specialty,
            diagnosis, treatment, notes
        ) VALUES (
            :id, :patient_id, :date, :reason, :doctor_name, :specialty,
            :diagnosis, :treatment, :notes
        )
        ON CONFLICT (id) DO UPDATE SET
            patient_id = EXCLUDED.patient_id,
            date = EXCLUDED.date,
            reason = EXCLUDED.reason,
            doctor_name = EXCLUDED.doctor_name,
            specialty = EXCLUDED.specialty,
            diagnosis = EXCLUDED.diagnosis,
            treatment = EXCLUDED.treatment,
            notes = EXCLUDED.notes
        """,
    ),
]


def _sqlite_path() -> Path:
    path = SQLITE_PATH
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path
    if not path.exists():
        raise FileNotFoundError(f"SQLite introuvable : {path}")
    return path


def _fetch_sqlite(table: str, columns: list[str]) -> list[dict]:
    conn = sqlite3.connect(_sqlite_path())
    conn.row_factory = sqlite3.Row
    cols = ", ".join(columns)
    rows = conn.execute(f"SELECT {cols} FROM {table}").fetchall()
    conn.close()
    result: list[dict] = []
    for row in rows:
        item = {col: row[col] for col in columns}
        if table == "users" and not item.get("status"):
            item["status"] = "active"
        result.append(item)
    return result


def _migrate_table(table: str, columns: list[str], upsert_sql: str) -> int:
    rows = _fetch_sqlite(table, columns)
    if not rows:
        print(f"  {table}: 0 ligne (ignoré)")
        return 0

    engine = get_engine()
    total = 0
    with engine.begin() as conn:
        for i in range(0, len(rows), BATCH):
            batch = rows[i : i + BATCH]
            conn.execute(text(upsert_sql), batch)
            total += len(batch)
    print(f"  {table}: {total} ligne(s)")
    return total


def main() -> None:
    reset_engine()
    if not is_postgresql():
        print(f"DATABASE_URL doit être PostgreSQL, reçu : {sqlalchemy_url()}", file=sys.stderr)
        sys.exit(1)

    print(f"Source SQLite : {_sqlite_path()}")
    print(f"Cible         : {sqlalchemy_url()}")
    print("Migration…")

    grand_total = 0
    for table, columns, upsert_sql in TABLES:
        grand_total += _migrate_table(table, columns, upsert_sql)

    print(f"Terminé — {grand_total} enregistrement(s) traités.")


if __name__ == "__main__":
    main()
