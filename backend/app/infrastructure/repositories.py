from app.domain.models import Appointment, Doctor, MedicalVisit, Patient, User


class InMemoryUserRepository:
    def __init__(self) -> None:
        self._users = [
            User(
                id="u-admin",
                name="Admin SIH",
                email="admin@sihia.health",
                password="admin123",
                role="admin",
                facility="Hopital Central",
            ),
            User(
                id="u-doctor",
                name="Dr Benali",
                email="dr.benali@sihia.health",
                password="demo1234",
                role="doctor",
                facility="Hopital Central",
            ),
        ]

    def find_by_email(self, email: str) -> User | None:
        return next((u for u in self._users if u.email.lower() == email.lower()), None)


class InMemoryPatientRepository:
    def __init__(self) -> None:
        self._patients: list[Patient] = []

    def list(self, search: str | None = None, status: str | None = None) -> list[Patient]:
        items = self._patients
        if search:
            q = search.lower()
            items = [p for p in items if q in f"{p.first_name} {p.last_name}".lower() or q in p.record_number.lower()]
        if status and status != "all":
            items = [p for p in items if p.status == status]
        return items

    def get(self, patient_id: str) -> Patient | None:
        return next((p for p in self._patients if p.id == patient_id), None)

    def create(self, patient: Patient) -> Patient:
        self._patients.insert(0, patient)
        return patient

    def delete(self, patient_id: str) -> None:
        self._patients = [p for p in self._patients if p.id != patient_id]


class InMemoryDoctorRepository:
    def __init__(self) -> None:
        self._doctors: list[Doctor] = [
            Doctor(
                id="d-1",
                first_name="Amina",
                last_name="Diallo",
                specialty="Cardiologie",
                phone="+221700000001",
                email="amina.diallo@sihia.health",
                availability="available",
                patients_count=84,
                weekly_appointments=32,
                satisfaction=4.6,
                schedule=[{"day": d, "slots": ["09:00", "10:00"] if d in ("Lun", "Mar", "Jeu") else []} for d in ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]],
            ),
            Doctor(
                id="d-2",
                first_name="Youssef",
                last_name="Karim",
                specialty="Pediatrie",
                phone="+212600000002",
                email="youssef.karim@sihia.health",
                availability="busy",
                patients_count=102,
                weekly_appointments=40,
                satisfaction=4.4,
                schedule=[{"day": d, "slots": ["11:00", "14:00"] if d in ("Lun", "Mer", "Ven") else []} for d in ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]],
            ),
        ]

    def list(self) -> list[Doctor]:
        return self._doctors


class InMemoryMedicalHistoryRepository:
    """Stores medical visit history per patient with realistic seed data."""

    _SEED: list[dict] = [
        {
            "patient_prefix": None,  # will be attached to any patient
            "visits": [
                {
                    "id_suffix": "v1",
                    "date": "2026-03-12",
                    "reason": "Bilan annuel de routine",
                    "doctor_name": "Dr. Mansouri",
                    "specialty": "Médecine générale",
                    "diagnosis": "Bilan normal, légère hypertension artérielle de stade I",
                    "treatment": "Régime hyposodé, activité physique 30 min/j",
                    "notes": "Contrôle TA dans 3 mois",
                },
                {
                    "id_suffix": "v2",
                    "date": "2025-11-04",
                    "reason": "Consultation ORL",
                    "doctor_name": "Dr. Cherkaoui",
                    "specialty": "ORL",
                    "diagnosis": "Otite moyenne aiguë droite",
                    "treatment": "Amoxicilline 1g x2/j — 7 jours + analgésiques",
                    "notes": None,
                },
                {
                    "id_suffix": "v3",
                    "date": "2025-08-21",
                    "reason": "Vaccination grippe saisonnière",
                    "doctor_name": "Dr. Benali",
                    "specialty": "Médecine préventive",
                    "diagnosis": "Patient en bonne santé, vaccin administré",
                    "treatment": None,
                    "notes": "Rappel vaccin tétanos à prévoir dans 2 ans",
                },
                {
                    "id_suffix": "v4",
                    "date": "2025-04-15",
                    "reason": "Douleurs thoraciques atypiques",
                    "doctor_name": "Dr. Diallo",
                    "specialty": "Cardiologie",
                    "diagnosis": "Douleur musculo-squelettique, ECG normal",
                    "treatment": "AINS sur 5 jours, repos",
                    "notes": "Echo cardiaque non nécessaire",
                },
            ],
        }
    ]

    def __init__(self) -> None:
        self._visits: dict[str, list[MedicalVisit]] = {}

    def get_for_patient(self, patient_id: str) -> list[MedicalVisit]:
        if patient_id not in self._visits:
            seed = self._SEED[0]["visits"]
            self._visits[patient_id] = [
                MedicalVisit(
                    id=f"{patient_id}-{v['id_suffix']}",
                    patient_id=patient_id,
                    date=v["date"],
                    reason=v["reason"],
                    doctor_name=v["doctor_name"],
                    specialty=v["specialty"],
                    diagnosis=v["diagnosis"],
                    treatment=v["treatment"],
                    notes=v["notes"],
                )
                for v in seed
            ]
        return sorted(self._visits[patient_id], key=lambda x: x.date, reverse=True)

    def add_visit(self, visit: MedicalVisit) -> MedicalVisit:
        if visit.patient_id not in self._visits:
            self.get_for_patient(visit.patient_id)
        self._visits[visit.patient_id].insert(0, visit)
        return visit


class InMemoryAppointmentRepository:
    def __init__(self) -> None:
        self._appointments: list[Appointment] = []

    def list(self) -> list[Appointment]:
        return self._appointments

    def create(self, appointment: Appointment) -> Appointment:
        self._appointments.insert(0, appointment)
        return appointment

    def cancel(self, appointment_id: str) -> Appointment | None:
        for idx, appt in enumerate(self._appointments):
            if appt.id == appointment_id:
                updated = Appointment(**{**appt.__dict__, "status": "cancelled"})
                self._appointments[idx] = updated
                return updated
        return None
