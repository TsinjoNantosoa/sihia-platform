"""Synchronise les utilisateurs role=doctor avec la table doctors (annuaire / RDV)."""

from __future__ import annotations

import json
from uuid import uuid4

from app.domain.models import Doctor, User
from app.infrastructure.database import connect

_DEFAULT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in full_name.strip().split() if p]
    if not parts:
        return "Médecin", "Inconnu"
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _default_schedule() -> list[dict]:
    return [
        {"day": d, "slots": ["09:00", "10:00", "11:00"] if d in ("Lun", "Mar", "Mer", "Jeu", "Ven") else []}
        for d in _DEFAULT_DAYS
    ]


def ensure_doctor_profile_for_user(user: User, *, specialty: str = "Médecine générale") -> Doctor | None:
    """Crée une fiche doctors si absente (même email). Retourne None si role != doctor."""
    if user.role != "doctor" or user.status == "suspended":
        return None

    conn = connect()
    existing = conn.execute(
        "SELECT * FROM doctors WHERE lower(email)=lower(?)",
        (user.email,),
    ).fetchone()
    if existing:
        conn.close()
        return Doctor(
            id=existing["id"],
            first_name=existing["first_name"],
            last_name=existing["last_name"],
            specialty=existing["specialty"],
            phone=existing["phone"] or "",
            email=existing["email"],
            availability=existing["availability"] or "available",
            patients_count=int(existing["patients_count"] or 0),
            weekly_appointments=int(existing["weekly_appointments"] or 0),
            satisfaction=float(existing["satisfaction"] or 0),
            schedule=json.loads(existing["schedule"] or "[]"),
        )

    first, last = _split_name(user.name)
    # Strip leading "Dr" / "Dr." / "Docteur" from first name for cleaner display
    if first.lower().rstrip(".") in {"dr", "docteur"}:
        rest = last.split() if last else []
        if rest:
            first = rest[0]
            last = " ".join(rest[1:])
        else:
            first = "Médecin"
            last = ""
    doctor_id = f"d-{uuid4().hex[:10]}"
    schedule = json.dumps(_default_schedule())
    first_name = first or "Médecin"
    last_name = last  # may be empty
    conn.execute(
        """
        INSERT INTO doctors
          (id, first_name, last_name, specialty, phone, email, availability,
           patients_count, weekly_appointments, satisfaction, schedule)
        VALUES (?, ?, ?, ?, ?, ?, 'available', 0, 0, 4.5, ?)
        """,
        (doctor_id, first_name, last_name, specialty, "", user.email.lower(), schedule),
    )
    conn.commit()
    conn.close()
    return Doctor(
        id=doctor_id,
        first_name=first_name,
        last_name=last_name,
        specialty=specialty,
        phone="",
        email=user.email.lower(),
        availability="available",
        patients_count=0,
        weekly_appointments=0,
        satisfaction=4.5,
        schedule=_default_schedule(),
    )


def sync_all_doctor_users() -> int:
    """Backfill : chaque user role=doctor obtient une fiche doctors. Retourne le nombre créé."""
    conn = connect()
    rows = conn.execute(
        "SELECT id, name, email, password, role, facility, status FROM users WHERE role='doctor' AND status='active'",
    ).fetchall()
    conn.close()
    created = 0
    for row in rows:
        user = User(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            password=row["password"],
            role=row["role"],
            facility=row["facility"] or "Hopital Central",
            status=row.get("status") or "active",
        )
        before = connect()
        exists = before.execute(
            "SELECT id FROM doctors WHERE lower(email)=lower(?)",
            (user.email,),
        ).fetchone()
        before.close()
        if exists:
            continue
        ensure_doctor_profile_for_user(user)
        created += 1
    return created
