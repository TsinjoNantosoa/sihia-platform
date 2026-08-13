from app.voice.safety import assert_mutation_allowed, evaluate_voice_safety


def test_diagnosis_is_blocked() -> None:
    result = evaluate_voice_safety("What disease do I have? Can you diagnose me?")
    assert result.blocked is True
    assert result.kind == "diagnosis"


def test_emergency_escalates() -> None:
    result = evaluate_voice_safety("This is an emergency, heart attack")
    assert result.blocked is True
    assert result.kind == "emergency"
    assert result.escalate is True


def test_human_request_escalates_without_blocking_admin_flow() -> None:
    result = evaluate_voice_safety("I want to talk to a person")
    assert result.escalate is True
    assert result.kind == "human_request"


def test_mutation_guard() -> None:
    assert assert_mutation_allowed(patient_verified=False, confirmation_received=True) is not None
    assert assert_mutation_allowed(patient_verified=True, confirmation_received=False) is not None
    assert assert_mutation_allowed(patient_verified=True, confirmation_received=True) is None
