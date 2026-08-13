from datetime import datetime, timedelta, timezone

from app.application.schemas import AppointmentCreate, PatientCreate
from app.presentation.deps import appointments_service, call_service, patients_service, voice_availability, voice_tools
from app.voice.availability_service import WEEKDAY_FR
from app.voice.errors import APPOINTMENT_CONFLICT, CONFIRMATION_REQUIRED, OWNERSHIP_MISMATCH, PATIENT_NOT_VERIFIED
from app.voice.execution_context import VoiceExecutionContext


def _ctx(call, *, verified: bool = False, confirmed: bool = False, patient_id: str | None = None) -> VoiceExecutionContext:
    return VoiceExecutionContext(
        call_id=call.id,
        patient_id=patient_id if patient_id is not None else call.patient_id,
        patient_verified=verified,
        confirmation_received=confirmed,
        current_state="COMMIT" if confirmed else call.state,
    )


def _headers_call():
    return call_service.start_call(direction="inbound", phone_from="+212600222001", phone_to="+212600000000")


def _next_slot() -> str:
    start = datetime.now(timezone.utc) + timedelta(days=2)
    for _ in range(16):
        label = WEEKDAY_FR[start.weekday()]
        from app.presentation.deps import doctors_service

        for item in doctors_service.get("d-1").schedule:
            if item.get("day") == label and item.get("slots"):
                hhmm = item["slots"][0]
                hour, minute = (int(p) for p in hhmm.split(":")[:2])
                return start.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()
        start += timedelta(days=1)
    raise AssertionError("no slot")


def test_mutation_requires_verification_and_confirmation() -> None:
    call = _headers_call()
    denied = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": _next_slot()},
        call_id=call.id,
        context=_ctx(call, verified=False, confirmed=True),
    )
    assert denied["success"] is False
    assert denied["code"] == PATIENT_NOT_VERIFIED

    denied2 = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": _next_slot()},
        call_id=call.id,
        context=_ctx(call, verified=True, confirmed=False),
    )
    assert denied2["success"] is False
    assert denied2["code"] == CONFIRMATION_REQUIRED


def test_create_reschedule_cancel_happy_path() -> None:
    call = _headers_call()
    patient = patients_service.create(
        PatientCreate(
            firstName="Sarah",
            lastName="Johnson",
            dob="1990-01-15",
            gender="F",
            phone="+212600222002",
            email="sarah.johnson@demo.sihia",
            address="3 Demo",
            bloodType="B+",
            allergies=[],
        )
    )
    slot = _next_slot()
    created = voice_tools.invoke(
        "create_appointment",
        {
            "doctorId": "d-1",
            "patientId": patient.id,
            "date": slot,
            "reason": "Voice",
            "actionId": "a1",
        },
        call_id=call.id,
        context=_ctx(call, verified=True, confirmed=True, patient_id=patient.id),
    )
    assert created["success"] is True
    appt_id = created["data"]["appointmentId"]

    later = datetime.fromisoformat(slot.replace("Z", "+00:00")) + timedelta(days=7)
    # keep same weekday/time if possible
    alt = later.isoformat()
    if not voice_availability.is_slot_free("d-1", alt, 30, ignore_appointment_id=appt_id):
        alt = (later + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()

    moved = voice_tools.invoke(
        "reschedule_appointment",
        {"appointmentId": appt_id, "patientId": patient.id, "doctorId": "d-1", "date": alt, "actionId": "r1"},
        call_id=call.id,
        context=_ctx(call, verified=True, confirmed=True, patient_id=patient.id),
    )
    assert moved["success"] is True

    cancelled = voice_tools.invoke(
        "cancel_appointment",
        {"appointmentId": appt_id, "patientId": patient.id, "actionId": "c1"},
        call_id=call.id,
        context=_ctx(call, verified=True, confirmed=True, patient_id=patient.id),
    )
    assert cancelled["success"] is True
    assert cancelled["data"]["status"] == "cancelled"


def test_conflict_when_slot_taken_between_propose_and_commit() -> None:
    call = _headers_call()
    patient = patients_service.create(
        PatientCreate(
            firstName="Alex",
            lastName="Demo",
            dob="1985-05-05",
            gender="M",
            phone="+212600222003",
            email="alex.demo@demo.sihia",
            address="4 Demo",
            bloodType="O-",
            allergies=[],
        )
    )
    slot = _next_slot()
    other = appointments_service.create(
        AppointmentCreate(
            patientId="p-other",
            patientName="Other",
            doctorId="d-1",
            doctorName="Dr. Amina Diallo",
            date=slot,
            durationMin=30,
            reason="Taken",
            status="scheduled",
        )
    )
    result = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": patient.id, "date": slot, "actionId": "conflict-1"},
        call_id=call.id,
        context=_ctx(call, verified=True, confirmed=True, patient_id=patient.id),
    )
    assert result["success"] is False
    assert result["code"] == APPOINTMENT_CONFLICT
    appointments_service.cancel(other.id)


def test_verified_patient_rejects_external_patient_id() -> None:
    call = _headers_call()
    patient_a = patients_service.create(
        PatientCreate(
            firstName="Patient",
            lastName="Alpha",
            dob="1988-04-04",
            gender="F",
            phone="+212600222010",
            email="patient.alpha@demo.sihia",
            address="10 Demo",
            bloodType="A+",
            allergies=[],
        )
    )
    patient_b = patients_service.create(
        PatientCreate(
            firstName="Patient",
            lastName="Bravo",
            dob="1987-05-05",
            gender="M",
            phone="+212600222011",
            email="patient.bravo@demo.sihia",
            address="11 Demo",
            bloodType="O+",
            allergies=[],
        )
    )
    ctx = _ctx(call, verified=True, confirmed=True, patient_id=patient_a.id)
    created = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": patient_b.id, "date": _next_slot(), "actionId": "mismatch-1"},
        call_id=call.id,
        context=ctx,
    )
    assert created["success"] is False
    assert created["code"] == OWNERSHIP_MISMATCH

    listed = voice_tools.invoke(
        "get_patient_appointments",
        {"patientId": patient_b.id},
        call_id=call.id,
        context=ctx,
    )
    assert listed["success"] is False
    assert listed["code"] == OWNERSHIP_MISMATCH
