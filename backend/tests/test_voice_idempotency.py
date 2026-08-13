from uuid import uuid4

from app.application.schemas import PatientCreate
from app.presentation.deps import patients_service, voice_tools
from app.voice.call_service import CallService


def _slot() -> str:
    stamp = uuid4().int
    day = 1 + (stamp % 27)
    minute = stamp % 50
    return f"2099-04-{day:02d}T08:{minute:02d}:00+00:00"


def test_duplicate_create_replays_same_appointment() -> None:
    call = CallService().start_call(direction="inbound", phone_from="+212600333001", phone_to="+1")
    patient = patients_service.create(
        PatientCreate(
            firstName="Idem",
            lastName="Potent",
            dob="1979-09-09",
            gender="M",
            phone=f"+2126003{uuid4().hex[:6]}",
            email="idem@demo.sihia",
            address="5 Demo",
            bloodType="AB+",
            allergies=[],
        )
    )
    action_id = f"same-action-{uuid4().hex[:8]}"
    args = {
        "doctorId": "d-1",
        "patientId": patient.id,
        "date": _slot(),
        "actionId": action_id,
    }
    first = voice_tools.invoke(
        "create_appointment",
        args,
        call_id=call.id,
        patient_verified=True,
        confirmation_received=True,
        action_id=action_id,
    )
    second = voice_tools.invoke(
        "create_appointment",
        args,
        call_id=call.id,
        patient_verified=True,
        confirmation_received=True,
        action_id=action_id,
    )
    assert first["success"] and second["success"]
    assert first["data"]["appointmentId"] == second["data"]["appointmentId"]
