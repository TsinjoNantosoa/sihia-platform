from app.application.schemas import PatientCreate
from app.presentation.deps import patients_service, voice_identity


def test_search_patient_by_phone_and_name() -> None:
    created = patients_service.create(
        PatientCreate(
            firstName="Jean",
            lastName="Martin",
            dob="1988-03-12",
            gender="M",
            phone="+212600111001",
            email="jean.martin@demo.sihia",
            address="1 Demo Street",
            bloodType="O+",
            allergies=[],
        )
    )
    matches = voice_identity.search(phone="+212600111001", last_name="Martin", first_name="Jean")
    assert any(m["id"] == created.id for m in matches)
    matches_name = voice_identity.search(last_name="Martin", first_name="Jean")
    assert any(m["id"] == created.id for m in matches_name)


def test_verify_requires_matching_last_name() -> None:
    created = patients_service.create(
        PatientCreate(
            firstName="Maria",
            lastName="Garcia",
            dob="1991-07-04",
            gender="F",
            phone="+212600111002",
            email="maria.garcia@demo.sihia",
            address="2 Demo Street",
            bloodType="A+",
            allergies=[],
        )
    )
    ok, _ = voice_identity.verify(created.id, last_name="Garcia")
    assert ok is True
    bad, _ = voice_identity.verify(created.id, last_name="Wrong")
    assert bad is False
