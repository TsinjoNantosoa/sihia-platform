"""Persistance des événements d'audit admin (fichier JSONL)."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings

_lock = threading.Lock()


def audit_log_path() -> Path:
    raw = settings.audit_log_path.strip()
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def append_audit_record(payload: dict[str, Any]) -> None:
    record = dict(payload)
    record.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with _lock:
        with audit_log_path().open("a", encoding="utf-8") as handle:
            handle.write(line)


def read_audit_records(*, limit: int = 500, offset: int = 0) -> list[dict[str, Any]]:
    path = audit_log_path()
    if not path.exists():
        return []

    records: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    if offset:
        records = records[offset:]
    if limit > 0:
        records = records[-limit:]
    return records


def export_audit_jsonl(*, limit: int = 5000) -> bytes:
    path = audit_log_path()
    if not path.exists():
        return b""

    lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if limit > 0 and len(lines) > limit:
        lines = lines[-limit:]
    if not lines:
        return b""
    return ("\n".join(lines) + "\n").encode("utf-8")
