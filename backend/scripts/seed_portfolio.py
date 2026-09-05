#!/usr/bin/env python3
"""Seed portfolio Malt — données récentes et denses pour captures d'écran.

Usage (depuis backend/) :
    python scripts/seed_portfolio.py

Idempotent : efface les lignes préfixées `*-port-*` puis les recrée
relativement à la date du jour (dashboards, ML, patients, RDV, etc.).
"""

from __future__ import annotations

import json
import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password  # noqa: E402
from app.infrastructure.database import connect, run_migrations, sqlalchemy_url  # noqa: E402
from app.infrastructure.seed import seed_demo_data  # noqa: E402

FIRST_NAMES = (
    "Yassine", "Salma", "Omar", "Imane", "Karim", "Nora", "Mehdi", "Lina",
    "Adam", "Sara", "Rayan", "Hiba", "Sami", "Amina", "Nabil", "Fatima",
    "Hassan", "Leila", "Bilal", "Nadia", "Tarik", "Sofia", "Younes", "Meryem",
)
LAST_NAMES = (
    "Bennani", "Kadri", "Touzani", "El Idrissi", "Mansouri", "Benali",
    "Cherkaoui", "Alaoui", "Berrada", "Saidi", "Ziani", "Lahlou",
    "Amrani", "Fassi", "Tazi", "Ouazzani",
)
ADDRESSES = (
    "12 rue de la Liberte, Casablanca",
    "45 avenue Hassan II, Rabat",
    "8 boulevard Mohammed V, Marrakech",
    "23 rue de France, Tanger",
    "67 avenue Ibn Sina, Fes",
    "3 place des Nations, Agadir",
)
BLOOD_TYPES = ("A+", "O+", "B+", "AB+", "A-", "O-", "B-", "AB-")
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
    "Suivi diabete",
    "Migraines",
)
DIAGNOSES = (
    "Hypertension controlee",
    "Etat clinique stable",
    "Infection respiratoire legere",
    "Douleur lombaire",
    "Suivi grossesse normal",
    "Asthme leger",
)


def _wipe_portfolio(conn) -> None:
    for sql in (
        "DELETE FROM medical_visits WHERE id LIKE '%-port-%' OR patient_id LIKE 'p-port-%'",
        "DELETE FROM appointments WHERE id LIKE 'a-port-%' OR patient_id LIKE 'p-port-%'",
        "DELETE FROM patients WHERE id LIKE 'p-port-%'",
        "DELETE FROM ml_features_daily WHERE day >= date('now', '-120 days')",
    ):
        try:
            conn.execute(sql)
        except Exception:
            # SQLite date() may fail on some drivers — fallback handled later
            pass


def _wipe_portfolio_fallback(conn, today: date) -> None:
    """Nettoyage ml_features sans fonction date() SQL."""
    cutoff = (today - timedelta(days=120)).isoformat()
    rows = conn.execute("SELECT day FROM ml_features_daily").fetchall()
    for row in rows:
        day = str(row["day"])[:10]
        if day >= cutoff:
            conn.execute("DELETE FROM ml_features_daily WHERE day=?", (day,))


def seed_patients(conn, today: date, count: int = 80) -> int:
    inserted = 0
    for index in range(count):
        patient_id = f"p-port-{index + 1:03d}"
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(index * 5 + 2) % len(LAST_NAMES)]
        age = 4 + ((index * 11) % 78)
        month = (index % 12) + 1
        day = min(((index * 7) % 27) + 1, 28)
        dob = date(today.year - age, month, day)
        allergies = []
        if index % 7 == 0:
            allergies.append("Penicilline")
        if index % 11 == 0:
            allergies.append("Arachides")
        if index % 19 == 0:
            allergies.append("Latex")
        status = "admitted" if index % 13 == 0 else "inactive" if index % 17 == 0 else "active"
        last_visit = (today - timedelta(days=(index % 45))).isoformat() if status != "inactive" else None
        conn.execute(
            """
            INSERT INTO patients (
                id, record_number, first_name, last_name, dob, gender, phone, email,
                address, blood_type, allergies, insurance, status, last_visit,
                chronic_conditions, current_treatments, emergency_contact
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                patient_id,
                f"PT-P{900000 + index}",
                first_name,
                last_name,
                dob.isoformat(),
                "M" if index % 2 == 0 else "F",
                f"+2126{20000000 + index * 137:08d}"[:13],
                f"{first_name.lower()}.{last_name.lower().replace(' ', '')}{index + 1}@demo.sihia",
                ADDRESSES[index % len(ADDRESSES)],
                BLOOD_TYPES[index % len(BLOOD_TYPES)],
                json.dumps(allergies, ensure_ascii=False),
                ("CNSS", "CNOPS", "Privee", "Assurance Atlas")[index % 4],
                status,
                last_visit,
                "Diabete type 2" if index % 9 == 0 else ("Asthme" if index % 15 == 0 else None),
                "Metformine 500mg" if index % 9 == 0 else None,
                f"+2126{30000000 + index:08d}"[:13],
            ),
        )
        inserted += 1
    return inserted


def seed_extra_doctors(conn) -> int:
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
        exists = conn.execute("SELECT id FROM doctors WHERE id=?", (doctor_id,)).fetchone()
        if exists:
            continue
        schedule = json.dumps(
            [
                {
                    "day": day,
                    "slots": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
                    if day not in ("Sam", "Dim")
                    else (["10:00"] if day == "Sam" else []),
                }
                for day in days
            ],
            ensure_ascii=False,
        )
        conn.execute(
            """
            INSERT INTO doctors (
                id, first_name, last_name, specialty, phone, email, availability,
                patients_count, weekly_appointments, satisfaction, schedule
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                doctor_id,
                first_name,
                last_name,
                specialty,
                phone,
                email,
                "busy" if index % 3 == 0 else "available",
                60 + index * 12,
                28 + index,
                round(4.3 + (index % 5) * 0.12, 2),
                schedule,
            ),
        )
        inserted += 1
    return inserted


def seed_appointments(conn, today: date) -> int:
    doctors = conn.execute("SELECT id, first_name, last_name FROM doctors ORDER BY id").fetchall()
    patients = conn.execute(
        "SELECT id, first_name, last_name FROM patients WHERE id LIKE 'p-port-%' ORDER BY id"
    ).fetchall()
    if not doctors or not patients:
        return 0

    inserted = 0
    # 90 jours passés + aujourd'hui + 21 jours futurs
    for day_offset in range(-90, 22):
        appointment_day = today + timedelta(days=day_offset)
        # Priorité démo : aujourd'hui / demain très denses (même le week-end)
        weekday = appointment_day.weekday()
        if day_offset == 0:
            daily_count = 22
        elif day_offset in (1, -1):
            daily_count = 16
        elif abs(day_offset) <= 6:
            daily_count = 14 if weekday < 5 else 10
        elif weekday >= 5:
            daily_count = 5 + (abs(day_offset) % 2)
        else:
            daily_count = 9 + (abs(day_offset) % 5)

        for slot in range(daily_count):
            doctor = doctors[(day_offset * 3 + slot) % len(doctors)]
            patient = patients[(day_offset * 5 + slot * 7) % len(patients)]
            appointment_id = f"a-port-{appointment_day:%Y%m%d}-{slot + 1:02d}"
            hour = 8 + (slot % 10)
            minute = (slot * 3) % 60
            appointment_dt = datetime.combine(appointment_day, time(hour=min(hour, 19), minute=minute))

            if day_offset < -1:
                if (day_offset + slot) % 12 == 0:
                    status = "noshow"
                elif (day_offset + slot) % 17 == 0:
                    status = "cancelled"
                else:
                    status = "completed"
            elif day_offset == -1:
                status = "completed" if slot % 4 else "noshow"
            elif day_offset == 0:
                # Salle d'attente / workflow du jour
                cycle = ["arrived", "confirmed", "scheduled", "arrived", "confirmed"]
                status = cycle[slot % len(cycle)]
            elif day_offset == 1:
                status = "confirmed" if slot % 3 else "scheduled"
            else:
                status = "cancelled" if (day_offset + slot) % 14 == 0 else "scheduled"

            conn.execute(
                """
                INSERT INTO appointments (
                    id, patient_id, patient_name, doctor_id, doctor_name, date,
                    duration_min, reason, status
                ) VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (
                    appointment_id,
                    patient["id"],
                    f"{patient['first_name']} {patient['last_name']}",
                    doctor["id"],
                    f"Dr. {doctor['first_name']} {doctor['last_name']}",
                    appointment_dt.isoformat(),
                    30 if slot % 4 else 45,
                    REASONS[(day_offset + slot) % len(REASONS)],
                    status,
                ),
            )
            inserted += 1
    return inserted


def seed_medical_visits(conn, today: date) -> int:
    patients = conn.execute(
        "SELECT id, first_name, last_name FROM patients WHERE id LIKE 'p-port-%' ORDER BY id"
    ).fetchall()
    doctors = (
        ("Dr. Amina Diallo", "Cardiologie"),
        ("Dr. Youssef Karim", "Pediatrie"),
        ("Dr. Leila Mansouri", "Medecine generale"),
        ("Dr. Nabil Cherkaoui", "Neurologie"),
    )
    inserted = 0
    for p_index, patient in enumerate(patients):
        visit_count = 2 + (p_index % 3)
        for v_index in range(visit_count):
            visit_id = f"{patient['id']}-port-v{v_index + 1}"
            doctor_name, specialty = doctors[(p_index + v_index) % len(doctors)]
            visit_day = today - timedelta(days=7 + p_index * 2 + v_index * 18)
            conn.execute(
                """
                INSERT INTO medical_visits (
                    id, patient_id, date, reason, doctor_name, specialty,
                    diagnosis, treatment, notes
                ) VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (
                    visit_id,
                    patient["id"],
                    visit_day.isoformat(),
                    REASONS[(p_index + v_index) % len(REASONS)],
                    doctor_name,
                    specialty,
                    DIAGNOSES[(p_index + v_index) % len(DIAGNOSES)],
                    "Surveillance clinique et controle dans 30 jours",
                    "Donnee portfolio fictive — aucune donnee patient reelle",
                ),
            )
            inserted += 1
    return inserted


def seed_ml_features(conn, today: date) -> int:
    """Remplit ml_features_daily pour le forecasting (Prophet / linear)."""
    written = 0
    for offset in range(90, -1, -1):
        day = today - timedelta(days=offset)
        # Profil réaliste : semaine plus chargée, week-end plus calme
        base = 12 if day.weekday() < 5 else 5
        noise = (offset * 3) % 7
        count = max(0, base + noise - (2 if day.weekday() == 0 else 0))
        day_s = day.isoformat()
        exists = conn.execute("SELECT 1 FROM ml_features_daily WHERE day=?", (day_s,)).fetchone()
        now = datetime.now().isoformat()
        if exists:
            conn.execute(
                "UPDATE ml_features_daily SET appointment_count=?, updated_at=? WHERE day=?",
                (count, now, day_s),
            )
        else:
            conn.execute(
                "INSERT INTO ml_features_daily (day, appointment_count, updated_at) VALUES (?,?,?)",
                (day_s, count, now),
            )
        written += 1
    return written


def ensure_demo_passwords(conn) -> None:
    """Réassure les comptes démo (utile pour captures Malt)."""
    accounts = (
        ("admin@sihia.health", "admin123"),
        ("dr.benali@sihia.health", "demo1234"),
        ("manager@sihia.health", "manager123"),
        ("staff@sihia.health", "staff123"),
    )
    for email, password in accounts:
        row = conn.execute("SELECT id FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        if row:
            conn.execute(
                "UPDATE users SET password=?, status='active' WHERE id=?",
                (hash_password(password), row["id"]),
            )


def main() -> None:
    print(f"Base cible : {sqlalchemy_url()}")
    run_migrations()
    seed_demo_data()

    today = date.today()
    conn = connect()
    _wipe_portfolio(conn)
    _wipe_portfolio_fallback(conn, today)

    created = {
        "doctors": seed_extra_doctors(conn),
        "patients": seed_patients(conn, today, count=80),
        "appointments": seed_appointments(conn, today),
        "medical_visits": seed_medical_visits(conn, today),
        "ml_features_days": seed_ml_features(conn, today),
    }
    ensure_demo_passwords(conn)
    conn.commit()

    totals = {
        "patients": conn.execute("SELECT COUNT(*) AS c FROM patients").fetchone()["c"],
        "doctors": conn.execute("SELECT COUNT(*) AS c FROM doctors").fetchone()["c"],
        "appointments": conn.execute("SELECT COUNT(*) AS c FROM appointments").fetchone()["c"],
        "medical_visits": conn.execute("SELECT COUNT(*) AS c FROM medical_visits").fetchone()["c"],
        "today_appts": conn.execute(
            "SELECT COUNT(*) AS c FROM appointments WHERE date LIKE ?",
            (today.isoformat() + "%",),
        ).fetchone()["c"],
    }
    conn.close()

    from app.application.analytics_service import AnalyticsService

    kpis = AnalyticsService().kpis()
    print("Lignes portfolio ajoutees :", json.dumps(created, ensure_ascii=False))
    print("Totaux :", json.dumps(totals, ensure_ascii=False))
    print("KPIs :", json.dumps(kpis, ensure_ascii=False))
    print()
    print("Comptes demo :")
    print("  admin@sihia.health / admin123")
    print("  dr.benali@sihia.health / demo1234")
    print("  manager@sihia.health / manager123")


if __name__ == "__main__":
    main()
