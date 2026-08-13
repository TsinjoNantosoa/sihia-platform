"""Machine à états conversationnelle — le LLM ne pilote pas les transitions métier."""

from __future__ import annotations

from typing import Literal

VoiceState = Literal[
    "CALL_STARTED",
    "DISCLOSURE",
    "IDENTIFY_INTENT",
    "IDENTIFY_PATIENT",
    "VERIFY_PATIENT",
    "SELECT_WORKFLOW",
    "BOOK",
    "RESCHEDULE",
    "CANCEL",
    "INFO",
    "SEARCH",
    "PROPOSE",
    "SELECT",
    "CONFIRM",
    "COMMIT",
    "SEND_CONFIRMATION",
    "END",
    "HUMAN_ESCALATION",
    "EMERGENCY_EXIT",
    "TIMEOUT",
    "TECHNICAL_FAILURE",
    "CALL_ENDED",
]

WORKFLOW_STATES = {"BOOK", "RESCHEDULE", "CANCEL", "INFO"}
TERMINAL_STATES = {
    "END",
    "HUMAN_ESCALATION",
    "EMERGENCY_EXIT",
    "TIMEOUT",
    "TECHNICAL_FAILURE",
    "CALL_ENDED",
}
MUTATION_STATES = {"CONFIRM", "COMMIT"}

_TRANSITIONS: dict[str, set[str]] = {
    "CALL_STARTED": {"DISCLOSURE", "TECHNICAL_FAILURE"},
    "DISCLOSURE": {"IDENTIFY_INTENT", "HUMAN_ESCALATION", "EMERGENCY_EXIT"},
    "IDENTIFY_INTENT": {
        "IDENTIFY_PATIENT",
        "INFO",
        "HUMAN_ESCALATION",
        "EMERGENCY_EXIT",
        "TIMEOUT",
    },
    "IDENTIFY_PATIENT": {"VERIFY_PATIENT", "HUMAN_ESCALATION", "TIMEOUT", "IDENTIFY_INTENT"},
    "VERIFY_PATIENT": {"SELECT_WORKFLOW", "IDENTIFY_PATIENT", "HUMAN_ESCALATION", "TIMEOUT"},
    "SELECT_WORKFLOW": {"BOOK", "RESCHEDULE", "CANCEL", "INFO", "HUMAN_ESCALATION"},
    "BOOK": {"SEARCH", "HUMAN_ESCALATION"},
    "RESCHEDULE": {"SEARCH", "SELECT", "HUMAN_ESCALATION"},
    "CANCEL": {"SELECT", "CONFIRM", "HUMAN_ESCALATION"},
    "INFO": {"END", "SELECT_WORKFLOW", "HUMAN_ESCALATION"},
    "SEARCH": {"PROPOSE", "NO_WAIT", "HUMAN_ESCALATION", "TIMEOUT"},
    "PROPOSE": {"SELECT", "SEARCH", "HUMAN_ESCALATION", "TIMEOUT"},
    "SELECT": {"CONFIRM", "PROPOSE", "SEARCH", "HUMAN_ESCALATION"},
    "CONFIRM": {"COMMIT", "PROPOSE", "SELECT", "HUMAN_ESCALATION"},
    "COMMIT": {"SEND_CONFIRMATION", "PROPOSE", "TECHNICAL_FAILURE", "HUMAN_ESCALATION"},
    "SEND_CONFIRMATION": {"END", "TECHNICAL_FAILURE"},
    "END": {"CALL_ENDED"},
    "HUMAN_ESCALATION": {"CALL_ENDED"},
    "EMERGENCY_EXIT": {"CALL_ENDED"},
    "TIMEOUT": {"CALL_ENDED", "HUMAN_ESCALATION"},
    "TECHNICAL_FAILURE": {"CALL_ENDED", "HUMAN_ESCALATION"},
    "CALL_ENDED": set(),
}

# SEARCH peut aller vers PROPOSE ; NO_WAIT n'est pas un état — on mappe vers PROPOSE/HUMAN
_TRANSITIONS["SEARCH"] = {"PROPOSE", "HUMAN_ESCALATION", "TIMEOUT", "SELECT_WORKFLOW"}


class InvalidVoiceTransition(ValueError):
    pass


def can_transition(current: str, target: str) -> bool:
    if current == target:
        return True
    if target in TERMINAL_STATES and current not in {"CALL_ENDED"}:
        return True
    return target in _TRANSITIONS.get(current, set())


def transition(current: str, target: str) -> str:
    if not can_transition(current, target):
        raise InvalidVoiceTransition(f"{current} -> {target} interdite")
    return target


def is_terminal(state: str) -> bool:
    return state in TERMINAL_STATES
