import json
from typing import Any

from app.domain.models import Appointment, Doctor, MedicalVisit, Patient, User
from app.infrastructure.database import connect


def _row_to_user(row: dict[str, Any]) -> User:
    return User(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        password=row["password"],
        role=row["role"],
        facility=row["facility"],
        status=row.get("status") or "active",
        last_login=row.get("last_login"),
    )


class SQLiteUserRepository:
    def list_all(self) -> list[User]:
        conn = connect()
        rows = conn.execute("SELECT * FROM users ORDER BY name").fetchall()
        conn.close()
        return [_row_to_user(r) for r in rows]

    def find_by_email(self, email: str) -> User | None:
        conn = connect()
        row = conn.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        conn.close()
        if not row:
            return None
        return _row_to_user(row)

    def find_by_id(self, user_id: str) -> User | None:
        conn = connect()
        row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        conn.close()
        if not row:
            return None
        return _row_to_user(row)

    def create(self, user: User) -> User:
        conn = connect()
        conn.execute(
            "INSERT INTO users (id,name,email,password,role,facility,status,last_login) VALUES (?,?,?,?,?,?,?,?)",
            (
                user.id,
                user.name,
                user.email,
                user.password,
                user.role,
                user.facility,
                user.status,
                user.last_login,
            ),
        )
        conn.commit()
        conn.close()
        return user

    def update(self, user: User) -> User:
        conn = connect()
        conn.execute(
            "UPDATE users SET name=?, email=?, password=?, role=?, facility=?, status=?, last_login=? WHERE id=?",
            (
                user.name,
                user.email,
                user.password,
                user.role,
                user.facility,
                user.status,
                user.last_login,
                user.id,
            ),
        )
        conn.commit()
        conn.close()
        return user

    def touch_last_login(self, user_id: str, when_iso: str) -> None:
        conn = connect()
        conn.execute("UPDATE users SET last_login=? WHERE id=?", (when_iso, user_id))
        conn.commit()
        conn.close()

    def delete(self, user_id: str) -> None:
        conn = connect()
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
        conn.close()

    def count_admins(self) -> int:
        conn = connect()
        count = conn.execute(
            "SELECT COUNT(*) AS c FROM users WHERE role='admin' AND status='active'",
        ).fetchone()["c"]
        conn.close()
        return int(count)


class SQLitePatientRepository:
    def list(self, search: str | None = None, status: str | None = None) -> list[Patient]:
        conn = connect()
        query = "SELECT * FROM patients"
        clauses: list[str] = []
        params: list[str] = []
        if search:
            clauses.append("(lower(first_name || ' ' || last_name) LIKE lower(?) OR lower(record_number) LIKE lower(?))")
            params.extend([f"%{search}%", f"%{search}%"])
        if status and status != "all":
            clauses.append("status = ?")
            params.append(status)
        if clauses:
            query += " WHERE " + " AND ".join(clauses)
        query += " ORDER BY id DESC"
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [
            Patient(**{**r, "allergies": json.loads(r["allergies"] or "[]")})
            for r in rows
        ]

    def get(self, patient_id: str) -> Patient | None:
        conn = connect()
        r = conn.execute("SELECT * FROM patients WHERE id=?", (patient_id,)).fetchone()
        conn.close()
        if not r:
            return None
        return Patient(**{**r, "allergies": json.loads(r["allergies"] or "[]")})

    def create(self, patient: Patient) -> Patient:
        conn = connect()
        conn.execute(
            """
            INSERT INTO patients (id,record_number,first_name,last_name,dob,gender,phone,email,address,blood_type,allergies,insurance,status,last_visit)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                patient.id,
                patient.record_number,
                patient.first_name,
                patient.last_name,
                patient.dob,
                patient.gender,
                patient.phone,
                patient.email,
                patient.address,
                patient.blood_type,
                json.dumps(patient.allergies),
                patient.insurance,
                patient.status,
                patient.last_visit,
            ),
        )
        conn.commit()
        conn.close()
        return patient

    def update(self, patient: Patient) -> Patient:
        conn = connect()
        conn.execute(
            """
            UPDATE patients SET
                first_name=?, last_name=?, dob=?, gender=?, phone=?, email=?,
                address=?, blood_type=?, allergies=?, insurance=?, status=?, last_visit=?
            WHERE id=?
            """,
            (
                patient.first_name,
                patient.last_name,
                patient.dob,
                patient.gender,
                patient.phone,
                patient.email,
                patient.address,
                patient.blood_type,
                json.dumps(patient.allergies),
                patient.insurance,
                patient.status,
                patient.last_visit,
                patient.id,
            ),
        )
        conn.commit()
        conn.close()
        return patient

    def delete(self, patient_id: str) -> None:
        conn = connect()
        conn.execute("DELETE FROM patients WHERE id=?", (patient_id,))
        conn.execute("DELETE FROM medical_visits WHERE patient_id=?", (patient_id,))
        conn.commit()
        conn.close()


class SQLiteDoctorRepository:
    def _row_to_doctor(self, r: dict[str, Any]) -> Doctor:
        return Doctor(**{**r, "schedule": json.loads(r["schedule"] or "[]")})

    def list(self) -> list[Doctor]:
        conn = connect()
        rows = conn.execute("SELECT * FROM doctors ORDER BY last_name, first_name").fetchall()
        conn.close()
        return [self._row_to_doctor(r) for r in rows]

    def get(self, doctor_id: str) -> Doctor | None:
        conn = connect()
        row = conn.execute("SELECT * FROM doctors WHERE id=?", (doctor_id,)).fetchone()
        conn.close()
        if not row:
            return None
        return self._row_to_doctor(row)

    def update(self, doctor: Doctor) -> Doctor:
        conn = connect()
        conn.execute(
            """
            UPDATE doctors SET
                phone=?, availability=?, weekly_appointments=?, schedule=?
            WHERE id=?
            """,
            (
                doctor.phone,
                doctor.availability,
                doctor.weekly_appointments,
                json.dumps(doctor.schedule),
                doctor.id,
            ),
        )
        conn.commit()
        conn.close()
        return doctor


class SQLiteMedicalHistoryRepository:
    _SEED = [
        ("2026-03-12", "Bilan annuel de routine", "Dr. Mansouri", "Médecine générale", "Bilan normal, légère hypertension artérielle de stade I", "Régime hyposodé, activité physique 30 min/j", "Contrôle TA dans 3 mois"),
        ("2025-11-04", "Consultation ORL", "Dr. Cherkaoui", "ORL", "Otite moyenne aiguë droite", "Amoxicilline 1g x2/j - 7 jours + analgésiques", None),
        ("2025-08-21", "Vaccination grippe saisonnière", "Dr. Benali", "Médecine préventive", "Patient en bonne santé, vaccin administré", None, "Rappel vaccin tétanos à prévoir dans 2 ans"),
        ("2025-04-15", "Douleurs thoraciques atypiques", "Dr. Diallo", "Cardiologie", "Douleur musculo-squelettique, ECG normal", "AINS sur 5 jours, repos", "Echo cardiaque non nécessaire"),
    ]

    def _seed_if_empty(self, patient_id: str) -> None:
        conn = connect()
        c = conn.execute("SELECT COUNT(*) AS c FROM medical_visits WHERE patient_id=?", (patient_id,)).fetchone()["c"]
        if c == 0:
            for i, v in enumerate(self._SEED, start=1):
                conn.execute(
                    """
                    INSERT INTO medical_visits (id,patient_id,date,reason,doctor_name,specialty,diagnosis,treatment,notes)
                    VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    (f"{patient_id}-v{i}", patient_id, *v),
                )
            conn.commit()
        conn.close()

    def get_for_patient(self, patient_id: str) -> list[MedicalVisit]:
        self._seed_if_empty(patient_id)
        conn = connect()
        rows = conn.execute("SELECT * FROM medical_visits WHERE patient_id=? ORDER BY date DESC", (patient_id,)).fetchall()
        conn.close()
        return [MedicalVisit(**r) for r in rows]

    def add_visit(self, visit: MedicalVisit) -> MedicalVisit:
        conn = connect()
        conn.execute(
            """
            INSERT INTO medical_visits (id,patient_id,date,reason,doctor_name,specialty,diagnosis,treatment,notes)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                visit.id,
                visit.patient_id,
                visit.date,
                visit.reason,
                visit.doctor_name,
                visit.specialty,
                visit.diagnosis,
                visit.treatment,
                visit.notes,
            ),
        )
        conn.commit()
        conn.close()
        return visit


class SQLiteAppointmentRepository:
    def list(self) -> list[Appointment]:
        conn = connect()
        rows = conn.execute("SELECT * FROM appointments ORDER BY date DESC").fetchall()
        conn.close()
        return [Appointment(**r) for r in rows]

    def get(self, appointment_id: str) -> Appointment | None:
        conn = connect()
        row = conn.execute("SELECT * FROM appointments WHERE id=?", (appointment_id,)).fetchone()
        conn.close()
        return Appointment(**row) if row else None

    def create(self, appointment: Appointment) -> Appointment:
        conn = connect()
        conn.execute(
            """
            INSERT INTO appointments (id,patient_id,patient_name,doctor_id,doctor_name,date,duration_min,reason,status)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                appointment.id,
                appointment.patient_id,
                appointment.patient_name,
                appointment.doctor_id,
                appointment.doctor_name,
                appointment.date,
                appointment.duration_min,
                appointment.reason,
                appointment.status,
            ),
        )
        conn.commit()
        conn.close()
        return appointment

    def cancel(self, appointment_id: str) -> Appointment | None:
        conn = connect()
        row = conn.execute("SELECT * FROM appointments WHERE id=?", (appointment_id,)).fetchone()
        if not row:
            conn.close()
            return None
        conn.execute("UPDATE appointments SET status='cancelled' WHERE id=?", (appointment_id,))
        conn.commit()
        updated = conn.execute("SELECT * FROM appointments WHERE id=?", (appointment_id,)).fetchone()
        conn.close()
        return Appointment(**updated) if updated else None


class SQLiteRefreshSessionRepository:
    def create(self, session_id: str, user_id: str, expires_at_ts: int) -> None:
        conn = connect()
        conn.execute(
            "INSERT OR REPLACE INTO refresh_sessions (session_id,user_id,expires_at_ts,revoked) VALUES (?,?,?,0)",
            (session_id, user_id, expires_at_ts),
        )
        conn.commit()
        conn.close()

    def is_active(self, session_id: str, user_id: str, now_ts: int) -> bool:
        conn = connect()
        row = conn.execute(
            "SELECT session_id FROM refresh_sessions WHERE session_id=? AND user_id=? AND revoked=0 AND expires_at_ts>?",
            (session_id, user_id, now_ts),
        ).fetchone()
        conn.close()
        return row is not None

    def revoke(self, session_id: str) -> None:
        conn = connect()
        conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE session_id=?", (session_id,))
        conn.commit()
        conn.close()

    def revoke_all_for_user(self, user_id: str) -> None:
        conn = connect()
        conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE user_id=?", (user_id,))
        conn.commit()
        conn.close()

    def prune_active_sessions(self, user_id: str, max_active: int, now_ts: int) -> None:
        conn = connect()
        rows = conn.execute(
            """
            SELECT session_id
            FROM refresh_sessions
            WHERE user_id=? AND revoked=0 AND expires_at_ts>?
            ORDER BY expires_at_ts DESC
            """,
            (user_id, now_ts),
        ).fetchall()
        if len(rows) > max_active:
            for row in rows[max_active:]:
                conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE session_id=?", (row["session_id"],))
        conn.commit()
        conn.close()
