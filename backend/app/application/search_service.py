"""Recherche globale patients / médecins / rendez-vous."""

from __future__ import annotations

from typing import Any

from app.infrastructure.database import connect


class SearchService:
    def search(self, query: str, *, limit: int = 8) -> dict[str, Any]:
        q = (query or "").strip()
        limit = max(1, min(limit, 20))
        if len(q) < 2:
            return {"query": q, "items": [], "total": 0}

        like = f"%{q.lower()}%"
        conn = connect()
        patients = conn.execute(
            """
            SELECT id, record_number, first_name, last_name, status
            FROM patients
            WHERE lower(first_name) LIKE ? OR lower(last_name) LIKE ?
               OR lower(record_number) LIKE ? OR lower(COALESCE(phone,'')) LIKE ?
            ORDER BY last_name, first_name
            LIMIT ?
            """,
            (like, like, like, like, limit),
        ).fetchall()
        doctors = conn.execute(
            """
            SELECT id, first_name, last_name, specialty
            FROM doctors
            WHERE lower(first_name) LIKE ? OR lower(last_name) LIKE ?
               OR lower(specialty) LIKE ?
            ORDER BY last_name, first_name
            LIMIT ?
            """,
            (like, like, like, limit),
        ).fetchall()
        appointments = conn.execute(
            """
            SELECT id, patient_id, patient_name, doctor_name, date, status, reason
            FROM appointments
            WHERE lower(patient_name) LIKE ? OR lower(doctor_name) LIKE ?
               OR lower(COALESCE(reason,'')) LIKE ?
            ORDER BY date DESC
            LIMIT ?
            """,
            (like, like, like, limit),
        ).fetchall()
        conn.close()

        items: list[dict[str, Any]] = []
        for p in patients:
            items.append(
                {
                    "type": "patient",
                    "id": p["id"],
                    "title": f"{p['first_name']} {p['last_name']}",
                    "subtitle": f"{p['record_number']} · {p['status']}",
                    "href": f"/patients/{p['id']}",
                }
            )
        for d in doctors:
            items.append(
                {
                    "type": "doctor",
                    "id": d["id"],
                    "title": f"Dr {d['first_name']} {d['last_name']}",
                    "subtitle": d["specialty"],
                    "href": "/doctors",
                }
            )
        for a in appointments:
            items.append(
                {
                    "type": "appointment",
                    "id": a["id"],
                    "title": a["patient_name"],
                    "subtitle": f"{a['date'][:16]} · {a['doctor_name']} · {a['status']}",
                    "href": "/appointments",
                    "patientId": a["patient_id"],
                }
            )

        return {"query": q, "items": items, "total": len(items)}
