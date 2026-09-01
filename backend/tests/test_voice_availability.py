from datetime import datetime, timedelta, timezone

from app.application.schemas import AppointmentCreate
from app.presentation.deps import appointments_service, doctors_service, voice_availability
from app.voice.availability_service import WEEKDAY_FR


def test_available_slots_come_from_doctor_schedule() -> None:
    doctor = doctors_service.get("d-1")
    assert doctor is not None
    slots = voice_availability.list_slots(doctor_id="d-1", limit=3)
    assert slots
    assert all(item["doctorId"] == "d-1" for item in slots)


def test_booked_slot_is_excluded_then_freed_after_cancel() -> None:
    start = datetime.now(timezone.utc) + timedelta(days=1)
    # Cherche un prochain jour où d-1 a un créneau
    for _ in range(14):
        label = WEEKDAY_FR[start.weekday()]
        day_slots = []
        for item in doctors_service.get("d-1").schedule:
            if item.get("day") == label:
                day_slots = item.get("slots") or []
        if day_slots:
            hhmm = day_slots[0]
            hour, minute = (int(p) for p in hhmm.split(":")[:2])
            slot_dt = start.replace(hour=hour, minute=minute, second=0, microsecond=0)
            break
        start += timedelta(days=1)
    else:
        raise AssertionError("Aucun créneau d-1")

    iso = slot_dt.isoformat()
    assert voice_availability.is_slot_free("d-1", iso, 30)
    created = appointments_service.create(
        AppointmentCreate(
            patientId="p-test",
            patientName="Voice Av",
            doctorId="d-1",
            doctorName="Dr. Amina Diallo",
            date=iso,
            durationMin=30,
            reason="Availability test",
            status="scheduled",
        )
    )
    assert voice_availability.is_slot_free("d-1", iso, 30) is False
    appointments_service.cancel(created.id)
    assert voice_availability.is_slot_free("d-1", iso, 30) is True
