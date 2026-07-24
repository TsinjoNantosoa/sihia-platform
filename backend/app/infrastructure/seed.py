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
