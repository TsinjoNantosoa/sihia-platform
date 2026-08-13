import pytest

from app.voice.state import InvalidVoiceTransition, can_transition, transition


def test_happy_path_transitions() -> None:
    state = "CALL_STARTED"
    for nxt in ("DISCLOSURE", "IDENTIFY_INTENT", "IDENTIFY_PATIENT", "VERIFY_PATIENT", "SELECT_WORKFLOW", "BOOK", "SEARCH", "PROPOSE", "SELECT", "CONFIRM", "COMMIT", "SEND_CONFIRMATION", "END"):
        state = transition(state, nxt)
    assert state == "END"


def test_global_exits_always_allowed() -> None:
    assert can_transition("PROPOSE", "HUMAN_ESCALATION")
    assert can_transition("CONFIRM", "EMERGENCY_EXIT")
    assert can_transition("SEARCH", "TIMEOUT")


def test_invalid_skip_is_rejected() -> None:
    with pytest.raises(InvalidVoiceTransition):
        transition("CALL_STARTED", "COMMIT")
