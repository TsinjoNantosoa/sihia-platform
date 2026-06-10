"""Rappels automatiques et manuels pour les rendez-vous."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.application.use_cases import _parse_appointment_dt
from app.domain.models import Appointment, AppointmentReminder, Patient, ReminderChannel, ReminderKind
from app.domain.ports import AppointmentRepository, PatientRepository
from app.infrastructure.notification_channels import channel_label, normalize_phone, send_email, send_sms
from app.infrastructure.reminder_repository import ReminderRepository

_ACTIVE_STATUSES = {"scheduled", "confirmed"}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _format_appt_datetime(value: str) -> str:
    dt = _parse_appointment_dt(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")


def _build_messages(appt: Appointment) -> tuple[str, str, str]:
    when = _format_appt_datetime(appt.date)
    subject = f"Rappel rendez-vous — {appt.patient_name}"
    email_body = (
        f"Bonjour {appt.patient_name},\n\n"
        f"Ceci est un rappel pour votre rendez-vous au SIH IA.\n"
        f"- Médecin : {appt.doctor_name}\n"
        f"- Date : {when}\n"
        f"- Motif : {appt.reason}\n\n"
        f"Merci de vous présenter 10 minutes avant l'heure prévue."
    )
    sms_body = (
        f"SIH IA: RDV {when} avec {appt.doctor_name} ({appt.reason}). "
        f"Merci d'arriver 10 min avant."
    )
    return subject, email_body, sms_body


class ReminderService:
    def __init__(
        self,
        appointments: AppointmentRepository,
        patients: PatientRepository,
        reminders: ReminderRepository,
        *,
        hours_before: int = 24,
    ) -> None:
        self.appointments = appointments
        self.patients = patients
        self.reminders = reminders
        self.hours_before = hours_before

    def _get_appointment(self, appointment_id: str) -> Appointment:
        appt = self.appointments.get(appointment_id)
        if appt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable")
        return appt

    def _get_patient(self, patient_id: str) -> Patient:
        patient = self.patients.get(patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable")
        return patient

    def list_for_appointment(self, appointment_id: str) -> list[AppointmentReminder]:
        self._get_appointment(appointment_id)
        return self.reminders.list_for_appointment(appointment_id)

    def summaries_for(self, appointment_ids: list[str]) -> dict[str, dict]:
        return self.reminders.summaries_for(appointment_ids)

    def send_manual(self, appointment_id: str, channels: list[ReminderChannel]) -> dict:
        appt = self._get_appointment(appointment_id)
        if appt.status not in _ACTIVE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rendez-vous non actif")
        patient = self._get_patient(appt.patient_id)
        return self._dispatch(appt, patient, channels, kind="manual")

    def run_auto_batch(self) -> dict:
        now = _utc_now()
        window_end = now + timedelta(hours=self.hours_before)
        processed = 0
        sent = 0
        skipped = 0
        failed = 0

        for appt in self.appointments.list():
            if appt.status not in _ACTIVE_STATUSES:
                continue
            start = _parse_appointment_dt(appt.date)
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            else:
                start = start.astimezone(timezone.utc)
            if start <= now or start > window_end:
                continue

            patient = self.patients.get(appt.patient_id)
            if patient is None:
                continue

            channels: list[ReminderChannel] = []
            if patient.email and not self.reminders.has_auto_reminder(appt.id, "email"):
                channels.append("email")
            phone = normalize_phone(patient.phone)
            if phone and not self.reminders.has_auto_reminder(appt.id, "sms"):
                channels.append("sms")
            if not channels:
                continue

            processed += 1
            result = self._dispatch(appt, patient, channels, kind="auto")
            for item in result["results"]:
                if item["status"] == "sent":
                    sent += 1
                elif item["status"] == "skipped":
                    skipped += 1
                else:
                    failed += 1

        return {"processed": processed, "sent": sent, "skipped": skipped, "failed": failed}

    def _dispatch(
        self,
        appt: Appointment,
        patient: Patient,
        channels: list[ReminderChannel],
        *,
        kind: ReminderKind,
    ) -> dict:
        subject, email_body, sms_body = _build_messages(appt)
        results: list[dict] = []
        now_iso = _utc_now().isoformat()

        for channel in channels:
            if channel == "email":
                recipient = (patient.email or "").strip()
                if not recipient:
                    reminder = self._record(
                        appt.id, channel, kind, "skipped", "", email_body, now_iso, "Email patient absent"
                    )
                    results.append(self._payload(reminder))
                    continue
                try:
                    send_email(recipient, subject, email_body)
                    reminder = self._record(appt.id, channel, kind, "sent", recipient, email_body, now_iso)
                    results.append(self._payload(reminder))
                except Exception as exc:  # noqa: BLE001 — notification provider
                    reminder = self._record(
                        appt.id, channel, kind, "failed", recipient, email_body, now_iso, str(exc)
                    )
                    results.append(self._payload(reminder))
                continue

            phone = normalize_phone(patient.phone)
            if not phone:
                reminder = self._record(
                    appt.id, channel, kind, "skipped", patient.phone or "", sms_body, now_iso, "Téléphone invalide"
                )
                results.append(self._payload(reminder))
                continue
            try:
                send_sms(phone, sms_body)
                reminder = self._record(appt.id, channel, kind, "sent", phone, sms_body, now_iso)
                results.append(self._payload(reminder))
            except Exception as exc:  # noqa: BLE001 — notification provider
                reminder = self._record(appt.id, channel, kind, "failed", phone, sms_body, now_iso, str(exc))
                results.append(self._payload(reminder))

        return {"appointmentId": appt.id, "results": results}

    def _record(
        self,
        appointment_id: str,
        channel: ReminderChannel,
        kind: ReminderKind,
        status_value: str,
        recipient: str,
        message: str,
        sent_at: str,
        error: str | None = None,
    ) -> AppointmentReminder:
        reminder = AppointmentReminder(
            id=f"rem-{uuid4().hex[:10]}",
            appointment_id=appointment_id,
            channel=channel,
            kind=kind,
            status=status_value,  # type: ignore[arg-type]
            recipient=recipient,
            message=message,
            sent_at=sent_at,
            error=error,
        )
        return self.reminders.create(reminder)

    @staticmethod
    def _payload(reminder: AppointmentReminder) -> dict:
        return {
            "id": reminder.id,
            "channel": reminder.channel,
            "channelLabel": channel_label(reminder.channel),
            "kind": reminder.kind,
            "status": reminder.status,
            "recipient": reminder.recipient,
            "sentAt": reminder.sent_at,
            "error": reminder.error,
        }
