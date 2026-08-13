"""Créneaux disponibles — réutilise overlap SIHIA, ne duplique pas la création RDV."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.application.use_cases import _appointments_overlap, _parse_appointment_dt
from app.domain.models import Appointment, Doctor
from app.domain.ports import AppointmentRepository, DoctorRepository

WEEKDAY_FR = {0: "Lun", 1: "Mar", 2: "Mer", 3: "Jeu", 4: "Ven", 5: "Sam", 6: "Dim"}
_ACTIVE = {"scheduled", "confirmed", "arrived"}


class AvailabilityService:
    def __init__(self, doctors: DoctorRepository, appointments: AppointmentRepository) -> None:
        self.doctors = doctors
        self.appointments = appointments

    def list_slots(
        self,
        *,
        doctor_id: str | None = None,
        specialty: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        duration_min: int = 30,
        limit: int = 6,
    ) -> list[dict[str, Any]]:
        start = start or datetime.now(timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        end = end or (start + timedelta(days=14))
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        doctors = self._matching_doctors(doctor_id=doctor_id, specialty=specialty)
        busy = [a for a in self.appointments.list() if a.status in _ACTIVE]
        found: list[dict[str, Any]] = []

        cursor = start.astimezone(timezone.utc)
        # Align to next minute boundary; iterate days
        day = datetime(cursor.year, cursor.month, cursor.day, tzinfo=timezone.utc)
        last = end.astimezone(timezone.utc)
        while day <= last and len(found) < limit:
            day_label = WEEKDAY_FR[day.weekday()]
            for doctor in doctors:
                if doctor.availability == "off":
                    continue
                for hhmm in self._slots_for_day(doctor, day_label):
                    slot_start = self._combine(day, hhmm)
                    if slot_start < cursor:
                        continue
                    if slot_start > last:
                        continue
                    if self._is_busy(doctor.id, slot_start, duration_min, busy):
                        continue
                    found.append(
                        {
                            "doctorId": doctor.id,
                            "doctorName": f"Dr. {doctor.first_name} {doctor.last_name}",
                            "specialty": doctor.specialty,
                            "start": slot_start.isoformat(),
                            "durationMin": duration_min,
                            "label": f"{day_label} {hhmm}",
                        }
                    )
                    if len(found) >= limit:
                        return found
            day += timedelta(days=1)
        return found

    def is_slot_free(
        self,
        doctor_id: str,
        start_iso: str,
        duration_min: int,
        *,
        ignore_appointment_id: str | None = None,
    ) -> bool:
        start = _parse_appointment_dt(start_iso)
        for appt in self.appointments.list():
            if appt.doctor_id != doctor_id or appt.status not in _ACTIVE:
                continue
            if ignore_appointment_id and appt.id == ignore_appointment_id:
                continue
            existing = _parse_appointment_dt(appt.date)
            if _appointments_overlap(start, duration_min, existing, appt.duration_min):
                return False
        return True

    def _matching_doctors(self, *, doctor_id: str | None, specialty: str | None) -> list[Doctor]:
        if doctor_id:
            doctor = self.doctors.get(doctor_id)
            return [doctor] if doctor else []
        doctors = self.doctors.list()
        if specialty:
            needle = specialty.strip().lower()
            doctors = [
                d
                for d in doctors
                if needle in d.specialty.lower() or needle in f"{d.first_name} {d.last_name}".lower()
            ]
        return doctors

    def _slots_for_day(self, doctor: Doctor, day_label: str) -> list[str]:
        for item in doctor.schedule or []:
            if str(item.get("day")) == day_label:
                return [str(s) for s in item.get("slots") or []]
        return []

    def _combine(self, day: datetime, hhmm: str) -> datetime:
        hour, minute = (int(p) for p in hhmm.split(":")[:2])
        return day.replace(hour=hour, minute=minute, second=0, microsecond=0)

    def _is_busy(
        self,
        doctor_id: str,
        start: datetime,
        duration_min: int,
        busy: list[Appointment],
    ) -> bool:
        for appt in busy:
            if appt.doctor_id != doctor_id:
                continue
            existing = _parse_appointment_dt(appt.date)
            if _appointments_overlap(start, duration_min, existing, appt.duration_min):
                return True
        return False
