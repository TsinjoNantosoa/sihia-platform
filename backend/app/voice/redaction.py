"""Minimisation PII pour les traces Voice (arguments / résultats de tools)."""

from __future__ import annotations

from typing import Any

_SECRET_KEYS = {
    "api_key",
    "token",
    "secret",
    "authorization",
    "password",
    "auth_token",
}
_PII_KEYS = {
    "dob",
    "date_of_birth",
    "phone",
    "phone_number",
    "phonefrom",
    "phoneto",
    "phone_from",
    "phone_to",
    "record_number",
    "recordnumber",
    "medical_record_number",
    "firstname",
    "first_name",
    "lastname",
    "last_name",
    "to",
}
_REDACT_KEYS = _SECRET_KEYS | _PII_KEYS


def _key_norm(key: str) -> str:
    return key.lower().replace("-", "_")


def redact_value(key: str, value: Any) -> Any:
    if _key_norm(key) in _REDACT_KEYS:
        return "[redacted]"
    if isinstance(value, dict):
        return redact_mapping(value)
    if isinstance(value, list):
        return [redact_value(key, item) for item in value]
    return value


def redact_mapping(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not payload:
        return {}
    return {key: redact_value(key, value) for key, value in payload.items()}


def minimize_tool_log(tool_name: str, payload: dict[str, Any] | None) -> dict[str, Any]:
    """Réduit les logs patient au minimum tout en gardant les IDs techniques."""
    data = redact_mapping(payload)
    if tool_name != "search_patient":
        return data
    inner = data.get("data")
    if not isinstance(inner, dict):
        return data
    patients = inner.get("patients")
    if not isinstance(patients, list):
        return data
    minimized = []
    for item in patients:
        if isinstance(item, dict) and item.get("id"):
            minimized.append({"patientId": item.get("id"), "matched": True})
        else:
            minimized.append({"matched": True})
    return {
        **data,
        "data": {
            "count": inner.get("count", len(minimized)),
            "patients": minimized,
        },
    }
