"""Codes d'erreur Voice AI (cahier des charges §13.3)."""

from __future__ import annotations

from typing import Any


PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND"
PATIENT_VERIFICATION_FAILED = "PATIENT_VERIFICATION_FAILED"
PATIENT_NOT_VERIFIED = "PATIENT_NOT_VERIFIED"
DOCTOR_NOT_FOUND = "DOCTOR_NOT_FOUND"
NO_AVAILABLE_SLOTS = "NO_AVAILABLE_SLOTS"
APPOINTMENT_NOT_FOUND = "APPOINTMENT_NOT_FOUND"
APPOINTMENT_CONFLICT = "APPOINTMENT_CONFLICT"
APPOINTMENT_NOT_RESCHEDULABLE = "APPOINTMENT_NOT_RESCHEDULABLE"
CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
OWNERSHIP_MISMATCH = "OWNERSHIP_MISMATCH"
SAFETY_BLOCKED = "SAFETY_BLOCKED"
TOOL_TIMEOUT = "TOOL_TIMEOUT"
DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE"
SMS_FAILED = "SMS_FAILED"
ESCALATION_UNAVAILABLE = "ESCALATION_UNAVAILABLE"
VOICE_DISABLED = "VOICE_DISABLED"
OUT_OF_SCOPE = "OUT_OF_SCOPE"


def tool_ok(data: Any = None) -> dict[str, Any]:
    return {"success": True, "data": data if data is not None else {}}


def tool_err(
    code: str,
    message: str,
    *,
    retryable: bool = False,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "success": False,
        "code": code,
        "message": message,
        "retryable": retryable,
    }
    if details:
        payload["details"] = details
    return payload
