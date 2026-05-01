import json
import sqlite3
from pathlib import Path

from app.core.config import settings
from app.core.security import hash_password
from app.domain.models import Appointment, Doctor, MedicalVisit, Patient, User


def _connect() -> sqlite3.Connection:
    db_path = Path(settings.database_url)
    if not db_path.is_absolute():
        db_path = Path(__file__).resolve().parents[2] / db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            facility TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            record_number TEXT NOT NULL UNIQUE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            dob TEXT NOT NULL,
            gender TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            allergies TEXT NOT NULL,
            insurance TEXT,
            status TEXT NOT NULL,
            last_visit TEXT
        );
        CREATE TABLE IF NOT EXISTS doctors (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            availability TEXT NOT NULL,
            patients_count INTEGER NOT NULL,
            weekly_appointments INTEGER NOT NULL,
            satisfaction REAL NOT NULL,
            schedule TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            doctor_id TEXT NOT NULL,
            doctor_name TEXT NOT NULL,
            date TEXT NOT NULL,
            duration_min INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS medical_visits (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            date TEXT NOT NULL,
            reason TEXT NOT NULL,
            doctor_name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            diagnosis TEXT NOT NULL,
            treatment TEXT,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS refresh_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at_ts INTEGER NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    conn.commit()

    if cur.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
        cur.executemany(
            "INSERT INTO users (id,name,email,password,role,facility) VALUES (?,?,?,?,?,?)",
            [
                ("u-admin", "Admin SIH", "admin@sihia.health", hash_password("admin123"), "admin", "Hopital Central"),
                ("u-doctor", "Dr Benali", "dr.benali@sihia.health", hash_password("demo1234"), "doctor", "Hopital Central"),
                ("u-manager", "Mme Diallo", "manager@sihia.health", hash_password("manager123"), "manager", "Hopital Central"),
                ("u-staff", "Accueil SIH", "staff@sihia.health", hash_password("staff123"), "staff", "Hopital Central"),
            ],
        )
    else:
        # One-time migration: hash existing plaintext passwords.
        rows = cur.execute("SELECT id, password FROM users").fetchall()
        for row in rows:
            pwd = row["password"]
            if not str(pwd).startswith("pbkdf2_sha256$"):
                cur.execute("UPDATE users SET password=? WHERE id=?", (hash_password(pwd), row["id"]))

    # Ensure demo accounts exist even if the database was initialized previously.
    for user_id, name, email, password, role in [
        ("u-manager", "Mme Diallo", "manager@sihia.health", "manager123", "manager"),
        ("u-staff", "Accueil SIH", "staff@sihia.health", "staff123", "staff"),
    ]:
        exists = cur.execute("SELECT 1 FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        if not exists:
            cur.execute(
                "INSERT INTO users (id,name,email,password,role,facility) VALUES (?,?,?,?,?,?)",
                (user_id, name, email, hash_password(password), role, "Hopital Central"),
            )
    if cur.execute("SELECT COUNT(*) AS c FROM doctors").fetchone()["c"] == 0:
        days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
        cur.executemany(
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


class SQLiteUserRepository:
    def find_by_email(self, email: str) -> User | None:
        conn = _connect()
        row = conn.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        conn.close()
        if not row:
            return None
        return User(**dict(row))

    def find_by_id(self, user_id: str) -> User | None:
        conn = _connect()
        row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        conn.close()
        if not row:
            return None
        return User(**dict(row))


class SQLitePatientRepository:
    def list(self, search: str | None = None, status: str | None = None) -> list[Patient]:
        conn = _connect()
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
        query += " ORDER BY rowid DESC"
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [
            Patient(**{**dict(r), "allergies": json.loads(r["allergies"] or "[]")})
            for r in rows
        ]

    def get(self, patient_id: str) -> Patient | None:
        conn = _connect()
        r = conn.execute("SELECT * FROM patients WHERE id=?", (patient_id,)).fetchone()
        conn.close()
        if not r:
            return None
        return Patient(**{**dict(r), "allergies": json.loads(r["allergies"] or "[]")})

    def create(self, patient: Patient) -> Patient:
        conn = _connect()
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

    def delete(self, patient_id: str) -> None:
        conn = _connect()
        conn.execute("DELETE FROM patients WHERE id=?", (patient_id,))
        conn.execute("DELETE FROM medical_visits WHERE patient_id=?", (patient_id,))
        conn.commit()
        conn.close()


class SQLiteDoctorRepository:
    def list(self) -> list[Doctor]:
        conn = _connect()
        rows = conn.execute("SELECT * FROM doctors").fetchall()
        conn.close()
        return [Doctor(**{**dict(r), "schedule": json.loads(r["schedule"] or "[]")}) for r in rows]


class SQLiteMedicalHistoryRepository:
    _SEED = [
        ("2026-03-12", "Bilan annuel de routine", "Dr. Mansouri", "Médecine générale", "Bilan normal, légère hypertension artérielle de stade I", "Régime hyposodé, activité physique 30 min/j", "Contrôle TA dans 3 mois"),
        ("2025-11-04", "Consultation ORL", "Dr. Cherkaoui", "ORL", "Otite moyenne aiguë droite", "Amoxicilline 1g x2/j - 7 jours + analgésiques", None),
        ("2025-08-21", "Vaccination grippe saisonnière", "Dr. Benali", "Médecine préventive", "Patient en bonne santé, vaccin administré", None, "Rappel vaccin tétanos à prévoir dans 2 ans"),
        ("2025-04-15", "Douleurs thoraciques atypiques", "Dr. Diallo", "Cardiologie", "Douleur musculo-squelettique, ECG normal", "AINS sur 5 jours, repos", "Echo cardiaque non nécessaire"),
    ]

    def _seed_if_empty(self, patient_id: str) -> None:
        conn = _connect()
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
        conn = _connect()
        rows = conn.execute("SELECT * FROM medical_visits WHERE patient_id=? ORDER BY date DESC", (patient_id,)).fetchall()
        conn.close()
        return [MedicalVisit(**dict(r)) for r in rows]

    def add_visit(self, visit: MedicalVisit) -> MedicalVisit:
        conn = _connect()
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
        conn = _connect()
        rows = conn.execute("SELECT * FROM appointments ORDER BY rowid DESC").fetchall()
        conn.close()
        return [Appointment(**dict(r)) for r in rows]

    def create(self, appointment: Appointment) -> Appointment:
        conn = _connect()
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
        conn = _connect()
        row = conn.execute("SELECT * FROM appointments WHERE id=?", (appointment_id,)).fetchone()
        if not row:
            conn.close()
            return None
        conn.execute("UPDATE appointments SET status='cancelled' WHERE id=?", (appointment_id,))
        conn.commit()
        updated = conn.execute("SELECT * FROM appointments WHERE id=?", (appointment_id,)).fetchone()
        conn.close()
        return Appointment(**dict(updated)) if updated else None


class SQLiteRefreshSessionRepository:
    def create(self, session_id: str, user_id: str, expires_at_ts: int) -> None:
        conn = _connect()
        conn.execute(
            "INSERT OR REPLACE INTO refresh_sessions (session_id,user_id,expires_at_ts,revoked) VALUES (?,?,?,0)",
            (session_id, user_id, expires_at_ts),
        )
        conn.commit()
        conn.close()

    def is_active(self, session_id: str, user_id: str, now_ts: int) -> bool:
        conn = _connect()
        row = conn.execute(
            "SELECT session_id FROM refresh_sessions WHERE session_id=? AND user_id=? AND revoked=0 AND expires_at_ts>?",
            (session_id, user_id, now_ts),
        ).fetchone()
        conn.close()
        return row is not None

    def revoke(self, session_id: str) -> None:
        conn = _connect()
        conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE session_id=?", (session_id,))
        conn.commit()
        conn.close()

    def revoke_all_for_user(self, user_id: str) -> None:
        conn = _connect()
        conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE user_id=?", (user_id,))
        conn.commit()
        conn.close()

    def prune_active_sessions(self, user_id: str, max_active: int, now_ts: int) -> None:
        conn = _connect()
        rows = conn.execute(
            """
            SELECT session_id
            FROM refresh_sessions
            WHERE user_id=? AND revoked=0 AND expires_at_ts>?
            ORDER BY rowid DESC
            """,
            (user_id, now_ts),
        ).fetchall()
        if len(rows) > max_active:
            for row in rows[max_active:]:
                conn.execute("UPDATE refresh_sessions SET revoked=1 WHERE session_id=?", (row["session_id"],))
        conn.commit()
        conn.close()
