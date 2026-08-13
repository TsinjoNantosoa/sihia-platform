"""Quiet hours outbound — fenêtre locale, y compris minuit."""

from __future__ import annotations

from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def _parse_hhmm(value: str) -> time | None:
    raw = (value or "").strip()
    if not raw:
        return None
    parts = raw.split(":")
    try:
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
    except (TypeError, ValueError):
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return time(hour=hour, minute=minute)


def resolve_timezone(name: str | None):
    key = (name or "UTC").strip() or "UTC"
    if key.upper() in {"UTC", "GMT", "Z"}:
        return timezone.utc
    try:
        return ZoneInfo(key)
    except ZoneInfoNotFoundError:
        return timezone.utc


def is_within_quiet_hours(
    *,
    start: str | None,
    end: str | None,
    timezone_name: str | None,
    now: datetime | None = None,
) -> bool:
    start_t = _parse_hhmm(start or "")
    end_t = _parse_hhmm(end or "")
    if start_t is None or end_t is None:
        return False
    if start_t == end_t:
        return False
    tz = resolve_timezone(timezone_name)
    current = (now or datetime.now(tz=tz)).astimezone(tz).time().replace(microsecond=0)
    if start_t < end_t:
        return start_t <= current < end_t
    return current >= start_t or current < end_t
