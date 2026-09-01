"""Données de démonstration — uniquement via SEED_DEMO_DATA=true ou scripts/seed_demo.py."""

from __future__ import annotations

import json
import logging

from app.core.security import hash_password
from app.infrastructure.database import connect

logger = logging.getLogger("sihia.seed")

_DEMO_ACCOUNTS = [
    ("u-admin", "Admin SIH", "admin@sihia.health", "admin123", "admin"),
    ("u-doctor", "Dr Benali", "dr.benali@sihia.health", "demo1234", "doctor"),
    ("u-manager", "Mme Diallo", "manager@sihia.health", "manager123", "manager"),
    ("u-staff", "Accueil SIH", "staff@sihia.health", "staff123", "staff"),
]


def is_legacy_plaintext_password(stored: str) -> bool:
    """Détecte un mot de passe stocké en clair (hors formats hash connus)."""
    if not stored:
        return False
    if stored.startswith("pbkdf2_sha256$"):
        return False
    if stored.startswith(("$2a$", "$2b$", "$2y$", "$argon2")):
        return False
    # bcrypt/argon2 contiennent des $ internes — ne pas re-hasher
    if stored.count("$") >= 2 and len(stored) > 40:
        return False
    return True


def migrate_legacy_password_hashes() -> int:
    """Re-hash les mots de passe legacy (plaintext) — script one-shot uniquement."""
    conn = connect()
    migrated = 0
    rows = conn.execute("SELECT id, password FROM users").fetchall()
    for row in rows:
        pwd = str(row["password"])
        if is_legacy_plaintext_password(pwd):
            conn.execute("UPDATE users SET password=? WHERE id=?", (hash_password(pwd), row["id"]))
            migrated += 1
    conn.commit()
    conn.close()
    return migrated


def seed_demo_data() -> None:
    """Charge les comptes et données de démonstration (appel explicite uniquement)."""
    conn = connect()
    if conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
        conn.executemany(
            "INSERT INTO users (id,name,email,password,role,facility,status) VALUES (?,?,?,?,?,?,?)",
            [
                (uid, name, email, hash_password(pwd), role, "Hopital Central", "active")
                for uid, name, email, pwd, role in _DEMO_ACCOUNTS
            ],
        )
        logger.info("demo_users_created count=%s", len(_DEMO_ACCOUNTS))
    else:
        for user_id, name, email, password, role in _DEMO_ACCOUNTS:
            row = conn.execute("SELECT id FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO users (id,name,email,password,role,facility,status) VALUES (?,?,?,?,?,?,?)",
                    (user_id, name, email, hash_password(password), role, "Hopital Central", "active"),
                )
                logger.info("demo_user_inserted email=%s", email)

    if conn.execute("SELECT COUNT(*) AS c FROM doctors").fetchone()["c"] == 0:
        days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
        conn.executemany(
            """
            INSERT INTO doctors (id,first_name,last_name,specialty,phone,email,availability,patients_count,weekly_appointments,satisfaction,schedule)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            [
                (
                    "d-1",
                    "Amina",
                    "Diallo",
                    "Cardiologie",
                    "+221700000001",
                    "amina.diallo@sihia.health",
                    "available",
                    84,
                    32,
                    4.6,
                    json.dumps([{"day": d, "slots": ["09:00", "10:00"] if d in ("Lun", "Mar", "Jeu") else []} for d in days]),
                ),
                (
                    "d-2",
                    "Youssef",
                    "Karim",
                    "Pediatrie",
                    "+212600000002",
                    "youssef.karim@sihia.health",
                    "busy",
                    102,
                    40,
                    4.4,
                    json.dumps([{"day": d, "slots": ["11:00", "14:00"] if d in ("Lun", "Mer", "Ven") else []} for d in days]),
                ),
            ],
        )

    _seed_demo_clinical_data(conn)
    conn.commit()
    conn.close()

    from app.infrastructure.doctor_sync import sync_all_doctor_users

    sync_all_doctor_users()
    _seed_voice_demo()
    logger.info("demo_seed_complete")


def _seed_demo_clinical_data(conn) -> None:
    from datetime import date, timedelta

    row = conn.execute("SELECT id FROM patients WHERE id=?", ("p-test",)).fetchone()
    if not row:
        conn.execute(
            """
            INSERT INTO patients (
                id, record_number, first_name, last_name, dob, gender, phone, email,
                address, blood_type, allergies, insurance, status, last_visit
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                "p-test",
                "PT-DEMO01",
                "Demo",
                "Patient",
                "1990-01-01",
                "M",
                "+212600000099",
                "demo.patient@sihia.health",
                "Casablanca",
                "O+",
                "[]",
                None,
                "active",
                None,
            ),
        )

    existing = conn.execute("SELECT COUNT(*) AS c FROM appointments").fetchone()["c"]
    if existing >= 10:
        return

    today = date.today()
    for offset in range(14, 0, -1):
        day = today - timedelta(days=offset)
        if offset % 2 == 0:
            continue
        appt_id = f"a-demo-{offset}"
        conn.execute(
            """
            INSERT OR IGNORE INTO appointments
                (id, patient_id, patient_name, doctor_id, doctor_name, date, duration_min, reason, status)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                appt_id,
                "p-test",
                "Demo Patient",
                "d-1",
                "Dr Amina Diallo",
                f"{day.isoformat()}T10:00:00",
                30,
                "Consultation démo",
                "scheduled",
            ),
        )
    logger.info("demo_clinical_data_ready")


def _seed_voice_demo() -> None:
    """Appels Voice synthétiques pour la console portfolio (aucune donnée réelle)."""
    from datetime import datetime, timezone

    from app.infrastructure.database import connect as db_connect

    conn = db_connect()
    try:
        count_row = conn.execute("SELECT COUNT(*) AS c FROM voice_calls").fetchone()
    except Exception:
        conn.close()
        return
    if count_row and int(count_row["c"]) > 0:
        conn.close()
        return

    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO voice_calls (
            id, provider_call_id, conversation_id, direction, phone_from, phone_to,
            patient_id, started_at, answered_at, ended_at, duration_seconds, status,
            intent, outcome, language, escalated, escalation_reason, appointment_id,
            state, identity_status, context_json, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            "vc-demo-001",
            "CA-demo-001",
            "conv-demo-001",
            "inbound",
            "+212600111222",
            "+212600000000",
            None,
            now,
            now,
            now,
            95,
            "completed",
            "book",
            "booked",
            "en",
            0,
            None,
            None,
            "CALL_ENDED",
            "verified",
            "{}",
            now,
        ),
    )
    conn.execute(
        "INSERT INTO voice_events (id, call_id, event_type, timestamp, payload_json) VALUES (?,?,?,?,?)",
        ("ve-demo-1", "vc-demo-001", "call.started", now, "{}"),
    )
    conn.execute(
        "INSERT INTO voice_events (id, call_id, event_type, timestamp, payload_json) VALUES (?,?,?,?,?)",
        ("ve-demo-2", "vc-demo-001", "patient.verified", now, '{"patientName":"Jean Martin"}'),
    )
    conn.execute(
        "INSERT INTO voice_events (id, call_id, event_type, timestamp, payload_json) VALUES (?,?,?,?,?)",
        ("ve-demo-3", "vc-demo-001", "appointment.confirmed", now, "{}"),
    )
    conn.execute(
        "INSERT INTO voice_events (id, call_id, event_type, timestamp, payload_json) VALUES (?,?,?,?,?)",
        ("ve-demo-4", "vc-demo-001", "call.ended", now, '{"outcome":"booked"}'),
    )
    conn.execute(
        """
        INSERT INTO voice_transcript_segments
            (id, call_id, speaker, content, started_at, ended_at, sequence_number)
        VALUES (?,?,?,?,?,?,?)
        """,
        ("vt-demo-1", "vc-demo-001", "agent", "Hello, I am the SIHIA automated voice assistant.", now, now, 1),
    )
    conn.execute(
        """
        INSERT INTO voice_transcript_segments
            (id, call_id, speaker, content, started_at, ended_at, sequence_number)
        VALUES (?,?,?,?,?,?,?)
        """,
        ("vt-demo-2", "vc-demo-001", "patient", "I need a cardiology appointment.", now, now, 2),
    )
    conn.execute(
        """
        INSERT INTO voice_tool_calls (
            id, call_id, tool_name, arguments_json, result_json, success, error_code, duration_ms, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?)
        """,
        (
            "vtc-demo-1",
            "vc-demo-001",
            "get_available_slots",
            '{"specialty":"cardiology"}',
            '{"success":true,"data":{"slots":[]}}',
            1,
            None,
            120,
            now,
        ),
    )
    conn.commit()
    conn.close()
