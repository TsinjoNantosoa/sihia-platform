from email.message import EmailMessage
from unittest.mock import MagicMock

import pytest

from app.core.config import settings
from app.infrastructure.notification_channels import (
    reminder_channels_status,
    send_email,
    send_sms,
)


def test_reminder_channels_status_log_mode() -> None:
    status = reminder_channels_status()
    assert status["email"]["mode"] == settings.reminder_email_mode.lower()
    assert status["email"]["ready"] is True
    assert status["sms"]["ready"] is True
    assert status["hoursBefore"] == settings.reminder_hours_before


def test_send_email_smtp_mode(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "reminder_email_mode", "smtp")
    monkeypatch.setattr(settings, "smtp_host", "localhost")
    monkeypatch.setattr(settings, "smtp_port", 1025)
    monkeypatch.setattr(settings, "smtp_use_tls", False)
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "reminder_log_path", str(tmp_path / "reminders.jsonl"))

    sent_messages: list[EmailMessage] = []
    mock_smtp = MagicMock()
    mock_smtp.__enter__.return_value = mock_smtp

    def capture_send(message: EmailMessage) -> None:
        sent_messages.append(message)

    mock_smtp.send_message = capture_send
    monkeypatch.setattr(
        "app.infrastructure.notification_channels.smtplib.SMTP",
        lambda *_a, **_k: mock_smtp,
    )

    send_email("patient@test.com", "Sujet test", "Corps test")

    assert len(sent_messages) == 1
    assert sent_messages[0]["To"] == "patient@test.com"
    log_lines = (tmp_path / "reminders.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(log_lines) == 1
    assert '"delivery": "sent"' in log_lines[0]


def test_send_email_smtp_without_host_raises(monkeypatch) -> None:
    monkeypatch.setattr(settings, "reminder_email_mode", "smtp")
    monkeypatch.setattr(settings, "smtp_host", "")

    with pytest.raises(RuntimeError, match="SMTP_HOST"):
        send_email("a@b.com", "x", "y")


def test_send_email_log_mode_writes_body(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "reminder_email_mode", "log")
    monkeypatch.setattr(settings, "reminder_log_path", str(tmp_path / "reminders.jsonl"))

    send_email("patient@test.com", "Sujet", "Corps détaillé")

    content = (tmp_path / "reminders.jsonl").read_text(encoding="utf-8")
    assert "Corps détaillé" in content
    assert '"delivery": "log"' in content


def test_send_sms_twilio_without_credentials_raises(monkeypatch) -> None:
    monkeypatch.setattr(settings, "reminder_sms_mode", "twilio")
    monkeypatch.setattr(settings, "twilio_account_sid", "")

    with pytest.raises(RuntimeError, match="Twilio"):
        send_sms("+212612345678", "test")
