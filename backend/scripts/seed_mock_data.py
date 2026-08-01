"""Populate the configured SIH IA database with realistic demo data.

The script is idempotent: rows use stable identifiers and existing rows are
left untouched. It works with the default SQLite database and PostgreSQL.
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.infrastructure.database import connect, run_migrations, sqlalchemy_url
from app.infrastructure.seed import seed_demo_data


FIRST_NAMES = (
    "Yassine", "Salma", "Omar", "Imane", "Karim", "Nora", "Mehdi", "Lina",
    "Adam", "Sara", "Rayan", "Hiba", "Sami", "Amina", "Nabil", "Fatima",
)
LAST_NAMES = (
    "Bennani", "Kadri", "Touzani", "El Idrissi", "Mansouri", "Benali",
    "Cherkaoui", "Alaoui", "Berrada", "Saidi", "Ziani", "Lahlou",
)
ADDRESSES = (
    "12 rue de la Liberte, Casablanca",
    "45 avenue Hassan II, Rabat",
    "8 boulevard Mohammed V, Marrakech",
    "23 rue de France, Tanger",
    "67 avenue Ibn Sina, Fes",
)
BLOOD_TYPES = ("A+", "O+", "B+", "AB+", "A-", "O-")
REASONS = (
    "Consultation de routine",
    "Suivi post-operatoire",
    "Douleurs thoraciques",
    "Bilan annuel",
    "Vaccination",
    "Renouvellement ordonnance",
    "Echographie",
    "Controle tension",
    "Consultation pediatrique",
    "Examen pre-operatoire",
)


def _insert_if_missing(conn, table: str, row_id: str, sql: str, values: tuple) -> bool:
    if conn.execute(f"SELECT id FROM {table} WHERE id=?", (row_id,)).fetchone():
        return False
    conn.execute(sql, values)
    return True


def seed_patients(conn, today: date) -> int:
    inserted = 0
    for index in range(48):
        patient_id = f"p-demo-{index + 1:03d}"
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(index * 5 + 2) % len(LAST_NAMES)]
        age = 5 + ((index * 11) % 76)
        dob = date(today.year - age, (index % 12) + 1, ((index * 7) % 27) + 1)
        allergies = []
        if index % 7 == 0:
            allergies.append("Penicilline")
        if index % 11 == 0:
            allergies.append("Arachides")
        status = "admitted" if index % 13 == 0 else "inactive" if index % 17 == 0 else "active"
        email_name = first_name.lower().replace(" ", "")
        email_last_name = last_name.lower().replace(" ", "")
        values = (
            patient_id,
            f"PT-{847000 + index * 13:06d}",
            first_name,
            last_name,
            dob.isoformat(),
            "M" if index % 2 == 0 else "F",
            f"+2126{10000000 + index * 137:08d}",
            f"{email_name}.{email_last_name}{index + 1}@example.test",
            ADDRESSES[index % len(ADDRESSES)],
            BLOOD_TYPES[index % len(BLOOD_TYPES)],
            json.dumps(allergies, ensure_ascii=False),
            ("CNSS", "CNOPS", "Privee")[index % 3],
            status,
            (today - timedelta(days=(index * 3) % 60)).isoformat(),
        )
        inserted += _insert_if_missing(
            conn,
            "patients",
            patient_id,
            """
            INSERT INTO patients (
                id,record_number,first_name,last_name,dob,gender,phone,email,address,
                blood_type,allergies,insurance,status,last_visit
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            values,
        )
    return inserted


def seed_doctors(conn) -> int:
    days = ("Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim")
    doctors = (
        ("d-3", "Leila", "Mansouri", "Medecine generale", "+212600000003", "leila.mansouri@sihia.health"),
        ("d-4", "Nabil", "Cherkaoui", "Neurologie", "+212600000004", "nabil.cherkaoui@sihia.health"),
        ("d-5", "Sara", "Berrada", "Gynecologie", "+212600000005", "sara.berrada@sihia.health"),
        ("d-6", "Omar", "Alaoui", "Radiologie", "+212600000006", "omar.alaoui@sihia.health"),
        ("d-7", "Fatima", "Saidi", "Dermatologie", "+212600000007", "fatima.saidi@sihia.health"),
        ("d-8", "Mehdi", "Ziani", "Urgences", "+212600000008", "mehdi.ziani@sihia.health"),
    )
    inserted = 0
    for index, doctor in enumerate(doctors):
        doctor_id, first_name, last_name, specialty, phone, email = doctor
        schedule = json.dumps(
            [
                {"day": day, "slots": ["09:00", "10:00", "11:00", "14:00", "15:00"] if day not in ("Sam", "Dim") else []}
                for day in days
            ],
            ensure_ascii=False,
        )
        inserted += _insert_if_missing(
            conn,
            "doctors",
            doctor_id,
            """
            INSERT INTO doctors (
                id,first_name,last_name,specialty,phone,email,availability,
                patients_count,weekly_appointments,satisfaction,schedule
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                doctor_id, first_name, last_name, specialty, phone, email,
                "busy" if index % 3 == 0 else "available",
                55 + index * 13, 25, 4.2 + (index % 4) * 0.15, schedule,
            ),
        )
    return inserted


def seed_appointments(conn, today: date) -> int:
    doctors = conn.execute(
        "SELECT id, first_name, last_name FROM doctors ORDER BY id",
    ).fetchall()
    patients = conn.execute(
        "SELECT id, first_name, last_name FROM patients WHERE id LIKE 'p-demo-%' ORDER BY id",
    ).fetchall()
    if not doctors or not patients:
        return 0

    inserted = 0
    for day_offset in range(-60, 15):
        appointment_day = today + timedelta(days=day_offset)
        daily_count = 2 + ((day_offset + 60) % 3)
        for slot in range(daily_count):
            doctor = doctors[(day_offset * 3 + slot) % len(doctors)]
            patient = patients[(day_offset * 5 + slot * 7) % len(patients)]
            appointment_id = f"a-demo-{appointment_day:%Y%m%d}-{slot + 1:02d}"
            appointment_dt = datetime.combine(
                appointment_day,
                time(hour=9 + slot * 2, minute=(day_offset % 2) * 15),
            )
            if day_offset < 0:
                status = "noshow" if (day_offset + slot) % 11 == 0 else "completed"
            elif day_offset == 0:
                status = "confirmed" if slot == 0 else "scheduled"
            else:
                status = "cancelled" if (day_offset + slot) % 13 == 0 else "scheduled"
            inserted += _insert_if_missing(
                conn,
                "appointments",
                appointment_id,
                """
                INSERT INTO appointments (
                    id,patient_id,patient_name,doctor_id,doctor_name,date,
                    duration_min,reason,status
                ) VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (
                    appointment_id,
                    patient["id"],
                    f"{patient['first_name']} {patient['last_name']}",
                    doctor["id"],
                    f"Dr. {doctor['first_name']} {doctor['last_name']}",
                    appointment_dt.isoformat(),
                    30,
                    REASONS[(day_offset + slot) % len(REASONS)],
                    status,
                ),
            )
    return inserted


def seed_medical_visits(conn, today: date) -> int:
    patients = conn.execute(
        "SELECT id FROM patients WHERE id LIKE 'p-demo-%' ORDER BY id LIMIT 24",
    ).fetchall()
    inserted = 0
    for patient_index, patient in enumerate(patients):
        for visit_index in range(2):
            visit_id = f"{patient['id']}-demo-v{visit_index + 1}"
            inserted += _insert_if_missing(
                conn,
                "medical_visits",
                visit_id,
                """
                INSERT INTO medical_visits (
                    id,patient_id,date,reason,doctor_name,specialty,diagnosis,treatment,notes
                ) VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (
                    visit_id,
                    patient["id"],
                    (today - timedelta(days=30 + patient_index * 4 + visit_index * 120)).isoformat(),
                    "Bilan annuel" if visit_index == 0 else "Consultation de suivi",
                    "Dr. Amina Diallo" if visit_index == 0 else "Dr. Leila Mansouri",
                    "Cardiologie" if visit_index == 0 else "Medecine generale",
                    "Etat clinique stable",
                    "Surveillance et controle regulier",
                    "Donnee fictive reservee aux tests",
                ),
            )
    return inserted


def counts(conn) -> dict[str, int]:
    tables = ("users", "patients", "doctors", "appointments", "medical_visits")
    return {table: conn.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()["c"] for table in tables}


def main() -> None:
    print(f"Base cible : {sqlalchemy_url()}")
    run_migrations()
    seed_demo_data()

    conn = connect()
    today = date.today()
    created = {
        "patients": seed_patients(conn, today),
        "doctors": seed_doctors(conn),
        "appointments": seed_appointments(conn, today),
        "medical_visits": seed_medical_visits(conn, today),
    }
    conn.commit()
    totals = counts(conn)
    conn.close()

    print("Lignes ajoutees : " + json.dumps(created, ensure_ascii=False))
    print("Totaux : " + json.dumps(totals, ensure_ascii=False))


if __name__ == "__main__":
    main()
