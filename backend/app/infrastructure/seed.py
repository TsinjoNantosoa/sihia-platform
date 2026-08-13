"""Données de démonstration (après migrations Alembic)."""

from __future__ import annotations

import json

from app.core.security import hash_password, verify_password
from app.infrastructure.database import connect


def seed_demo_data() -> None:
    conn = connect()
    if conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
        conn.executemany(
            "INSERT INTO users (id,name,email,password,role,facility,status) VALUES (?,?,?,?,?,?,?)",
            [
                ("u-admin", "Admin SIH", "admin@sihia.health", hash_password("admin123"), "admin", "Hopital Central", "active"),
                ("u-doctor", "Dr Benali", "dr.benali@sihia.health", hash_password("demo1234"), "doctor", "Hopital Central", "active"),
                ("u-manager", "Mme Diallo", "manager@sihia.health", hash_password("manager123"), "manager", "Hopital Central", "active"),
                ("u-staff", "Accueil SIH", "staff@sihia.health", hash_password("staff123"), "staff", "Hopital Central", "active"),
            ],
        )
    else:
        rows = conn.execute("SELECT id, password FROM users").fetchall()
        for row in rows:
            pwd = row["password"]
            if not str(pwd).startswith("pbkdf2_sha256$"):
                conn.execute("UPDATE users SET password=? WHERE id=?", (hash_password(pwd), row["id"]))

    demo_accounts = [
        ("u-admin", "Admin SIH", "admin@sihia.health", "admin123", "admin"),
        ("u-doctor", "Dr Benali", "dr.benali@sihia.health", "demo1234", "doctor"),
        ("u-manager", "Mme Diallo", "manager@sihia.health", "manager123", "manager"),
        ("u-staff", "Accueil SIH", "staff@sihia.health", "staff123", "staff"),
    ]
    for user_id, name, email, password, role in demo_accounts:
        row = conn.execute("SELECT id, password FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO users (id,name,email,password,role,facility,status) VALUES (?,?,?,?,?,?,?)",
                (user_id, name, email, hash_password(password), role, "Hopital Central", "active"),
            )
        elif not verify_password(password, row["password"]):
            conn.execute("UPDATE users SET password=? WHERE id=?", (hash_password(password), row["id"]))

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

    conn.commit()
    conn.close()

    from app.infrastructure.doctor_sync import sync_all_doctor_users

    sync_all_doctor_users()
    _seed_voice_demo()


def _seed_voice_demo() -> None:
    """Appels Voice synthétiques pour la console portfolio (aucune donnée réelle)."""
    from datetime import datetime, timezone
    from app.infrastructure.database import connect as db_connect

    conn = db_connect()
    try:
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='voice_calls'"
        ).fetchall()
    except Exception:
        tables = [{"name": "voice_calls"}]
    # PostgreSQL n'a pas sqlite_master — on tente le COUNT.
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
