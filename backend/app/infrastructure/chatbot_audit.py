from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

_lock = Lock()


def append_chat_audit(path: str, record: dict) -> None:
    log_path = Path(path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        **record,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    line = json.dumps(payload, ensure_ascii=False) + "\n"
    with _lock:
        with log_path.open("a", encoding="utf-8") as fh:
            fh.write(line)
