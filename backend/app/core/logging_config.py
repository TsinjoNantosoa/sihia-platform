"""Configuration des logs structurés (JSON) pour observabilité pilote."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


def log_event(logger: logging.Logger, level: int, event: str, **fields: Any) -> None:
    payload: dict[str, Any] = {
        "event": event,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        **fields,
    }
    logger.log(level, json.dumps(payload, ensure_ascii=False))


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    for name in ("sihia", "sihia.audit", "sihia.security"):
        log = logging.getLogger(name)
        log.handlers.clear()
        log.propagate = True
        log.setLevel(logging.INFO)
