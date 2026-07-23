"""Envoi email / SMS pour les rappels RDV (mode log par défaut, SMTP/Twilio optionnels)."""

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


def reminder_channels_status() -> dict:
    email_mode = settings.email_mode.lower()
    sms_mode = settings.reminder_sms_mode.lower()
    smtp_configured = bool(settings.smtp_host.strip())
    twilio_configured = bool(
        settings.twilio_account_sid.strip()
        and settings.twilio_auth_token.strip()
        and settings.twilio_from_number.strip()
    )

    email_ready = email_mode == "log" or (email_mode == "smtp" and smtp_configured)
    sms_ready = sms_mode == "log" or (sms_mode == "twilio" and twilio_configured)

    return {
        "email": {
            "mode": email_mode,
            "configured": smtp_configured if email_mode == "smtp" else True,
            "ready": email_ready,
            "smtpHost": settings.smtp_host or None,
            "smtpPort": settings.smtp_port if email_mode == "smtp" else None,
            "from": settings.smtp_from,
        },
        "sms": {
            "mode": sms_mode,
            "configured": twilio_configured if sms_mode == "twilio" else True,
            "ready": sms_ready,
        },
        "hoursBefore": settings.reminder_hours_before,
        "logPath": str(reminder_log_path()),
    }


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


def _send_smtp(message: EmailMessage) -> None:
    host = settings.smtp_host.strip()
    port = settings.smtp_port

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def send_email(to: str, subject: str, body: str) -> None:
    mode = settings.email_mode.lower()
    timestamp = datetime.now(timezone.utc).isoformat()

    if mode == "smtp":
        if not settings.smtp_host.strip():
            raise RuntimeError("EMAIL_MODE=smtp mais SMTP_HOST est vide")
        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        _send_smtp(message)
        _append_log(
            {
                "type": "email",
                "mode": "smtp",
                "delivery": "sent",
                "to": to,
                "subject": subject,
                "timestamp": timestamp,
            }
        )
        return

    _append_log(
        {
            "type": "email",
            "mode": mode,
            "delivery": "log",
            "to": to,
            "subject": subject,
            "body": body,
            "timestamp": timestamp,
        }
    )


# Captured in log mode for tests (password reset codes).
password_reset_outbox: list[dict] = []


def send_password_reset_email(*, recipient: str, code: str, expires_minutes: int) -> None:
    subject = "Votre code de réinitialisation SIH IA"
    body = (
        "Une demande de réinitialisation a été reçue pour votre compte SIH IA.\n\n"
        f"Votre code de vérification : {code}\n\n"
        "Saisissez ce code sur la page de réinitialisation pour choisir un nouveau mot de passe.\n"
        f"Ce code expire dans {expires_minutes} minutes et ne peut être utilisé qu'une fois.\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
    )
    send_email(recipient, subject, body)
    if settings.email_mode.lower() != "smtp":
        password_reset_outbox.append(
            {
                "to": recipient,
                "code": code,
                "subject": subject,
                "body": body,
            }
        )


def send_sms(to: str, body: str) -> None:
    mode = settings.reminder_sms_mode.lower()
    timestamp = datetime.now(timezone.utc).isoformat()

    if mode == "twilio":
        if not (
            settings.twilio_account_sid.strip()
            and settings.twilio_auth_token.strip()
            and settings.twilio_from_number.strip()
        ):
            raise RuntimeError("REMINDER_SMS_MODE=twilio mais identifiants Twilio incomplets")
        try:
            from twilio.rest import Client  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError("twilio non installé — pip install twilio") from exc
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(body=body, from_=settings.twilio_from_number, to=to)
        _append_log(
            {
                "type": "sms",
                "mode": "twilio",
                "delivery": "sent",
                "to": to,
                "timestamp": timestamp,
            }
        )
        return

    _append_log(
        {
            "type": "sms",
            "mode": mode,
            "delivery": "log",
            "to": to,
            "body": body,
            "timestamp": timestamp,
        }
    )


def channel_label(channel: Literal["email", "sms"]) -> str:
    return "E-mail" if channel == "email" else "SMS"
