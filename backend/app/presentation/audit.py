from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import Request

from app.infrastructure.audit_log import append_audit_record

logger = logging.getLogger("sihia.audit")


def log_admin_action(
    request: Request,
    *,
    action: str,
    actor_id: str | None,
    actor_email: str | None = None,
    target_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "event": "admin_action",
        "action": action,
        "actorId": actor_id,
        "actorEmail": actor_email,
        "targetId": target_id,
        "path": str(request.url.path),
        "method": request.method,
        "ip": request.client.host if request.client else "unknown",
        "correlationId": getattr(request.state, "correlation_id", None),
    }
    if extra:
        payload["extra"] = extra
    line = json.dumps(payload, ensure_ascii=False)
    logger.info(line)
    append_audit_record(payload)
