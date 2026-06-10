"""Envoi email / SMS pour les rappels RDV (mode log par défaut)."""

from __future__ import annotations

import json
import re
import smtplib
import threading
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Literal

from app.core.config import settings

_lock = threading.Lock()
_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


def reminder_log_path() -> Path:
    raw = settings.reminder_log_path.strip()
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _append_log(record: dict) -> None:
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with _lock:
        with reminder_log_path().open("a", encoding="utf-8") as handle:
            handle.write(line)


def normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"[^\d+]", "", value.strip())
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("0") and len(digits) >= 10:
        digits = "+212" + digits[1:]
    if not digits.startswith("+") and len(digits) >= 9:
        digits = "+" + digits
    return digits if _E164.match(digits) else None


def send_email(to: str, subject: str, body: str) -> None:
    mode = settings.reminder_email_mode.lower()
    if mode == "smtp" and settings.smtp_host:
        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_user:
                smtp.starttls()
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
    else:
        _append_log(
            {
                "type": "email",
                "mode": mode,
                "to": to,
                "subject": subject,
                "body": body,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )


def send_sms(to: str, body: str) -> None:
    mode = settings.reminder_sms_mode.lower()
    if mode == "twilio" and settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            from twilio.rest import Client  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError("twilio non installé — pip install twilio") from exc
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(body=body, from_=settings.twilio_from_number, to=to)
    else:
        _append_log(
            {
                "type": "sms",
                "mode": mode,
                "to": to,
                "body": body,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )


def channel_label(channel: Literal["email", "sms"]) -> str:
    return "E-mail" if channel == "email" else "SMS"
