"""Voice tools — toujours via les services SIHIA existants, jamais d'écriture SQL directe."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.application.schemas import AppointmentCreate
from app.application.use_cases import AppointmentsService, DoctorsService
from app.core.logging_config import log_event
from app.domain.ports import PatientRepository
from app.infrastructure.notification_channels import normalize_phone, send_sms
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.availability_service import AvailabilityService
from app.voice.errors import (
    APPOINTMENT_CONFLICT,
    APPOINTMENT_NOT_FOUND,
    APPOINTMENT_NOT_RESCHEDULABLE,
    CONFIRMATION_REQUIRED,
    DOCTOR_NOT_FOUND,
    HUMAN_ESCALATION_REQUESTED,
    NO_AVAILABLE_SLOTS,
    OWNERSHIP_MISMATCH,
    PATIENT_NOT_FOUND,
    PATIENT_NOT_VERIFIED,
    PATIENT_VERIFICATION_FAILED,
    SMS_FAILED,
    tool_err,
    tool_ok,
)
from app.voice.execution_context import VoiceExecutionContext
from app.voice.identity_service import IdentityService
from app.voice.metrics import voice_metrics
from app.voice.models import VoiceToolCall
from app.voice.redaction import minimize_tool_log
from app.voice.safety import assert_mutation_allowed
from app.voice.settings_service import VoiceSettingsService
from app.voice.tool_registry import MUTATION_TOOLS, ToolRegistry

logger = logging.getLogger("sihia.voice")

_ACTIVE_APPT = {"scheduled", "confirmed"}


class VoiceTools:
    def __init__(
        self,
        *,
        identity: IdentityService,
        availability: AvailabilityService,
        appointments: AppointmentsService,
        doctors: DoctorsService,
        patients: PatientRepository,
        repo: VoiceRepository,
        settings_svc: VoiceSettingsService | None = None,
    ) -> None:
        self.identity = identity
        self.availability = availability
        self.appointments = appointments
        self.doctors = doctors
        self.patients = patients
        self.repo = repo
        self.settings_svc = settings_svc or VoiceSettingsService(repo)
        self.registry = ToolRegistry()
        self.registry.register("search_patient", self.search_patient)
        self.registry.register("search_doctors", self.search_doctors)
        self.registry.register("get_available_slots", self.get_available_slots)
        self.registry.register("get_patient_appointments", self.get_patient_appointments)
        self.registry.register("create_appointment", self.create_appointment)
        self.registry.register("reschedule_appointment", self.reschedule_appointment)
        self.registry.register("cancel_appointment", self.cancel_appointment)
        self.registry.register("send_confirmation", self.send_confirmation)
        self.registry.register("escalate_to_human", self.escalate_to_human)

    def invoke(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        *,
        call_id: str,
        context: VoiceExecutionContext | None = None,
        idempotency_key: str | None = None,
        action_id: str | None = None,
        patient_verified: bool | None = None,
        confirmation_received: bool | None = None,
    ) -> dict[str, Any]:
        """Les flags patient_verified / confirmation_received réseau sont ignorés."""
        del patient_verified, confirmation_received
        resolved = context or self.context_for_call(call_id)
        handler = self.registry.get(tool_name)
        if handler is None:
            result = tool_err("UNKNOWN_TOOL", f"Tool inconnu: {tool_name}")
            self._persist(call_id, tool_name, arguments, result, 0)
            return result

        key = idempotency_key
        if tool_name in MUTATION_TOOLS:
            action = action_id or arguments.get("actionId") or "default"
            key = key or f"voice:{call_id}:appointment:{tool_name.split('_')[0]}:{action}"
            cached = self.repo.get_idempotent(key)
            if cached is not None:
                log_event(logger, logging.INFO, "voice.tool.idempotent_replay", call_id=call_id, tool=tool_name)
                return cached

        started = time.perf_counter()
        extra = {
            "call_id": resolved.call_id,
            "patient_id": resolved.patient_id,
            "patient_verified": resolved.patient_verified,
            "confirmation_received": resolved.confirmation_received,
            "current_state": resolved.current_state,
        }
        try:
            result = handler(arguments, extra)
        except HTTPException as exc:
            result = self._from_http(exc)
        except Exception as exc:  # noqa: BLE001 — tool boundary
            log_event(logger, logging.ERROR, "voice.tool.failed", call_id=call_id, tool=tool_name, error=str(exc))
            result = tool_err("DATABASE_UNAVAILABLE", "Service temporarily unavailable", retryable=True)
        duration_ms = int((time.perf_counter() - started) * 1000)
        self._persist(call_id, tool_name, arguments, result, duration_ms)
        if tool_name in MUTATION_TOOLS and key and result.get("success"):
            try:
                self.repo.put_idempotent(key, result)
            except Exception:
                pass
        log_event(
            logger,
            logging.INFO,
            "voice.tool.completed",
            call_id=call_id,
            tool=tool_name,
            duration_ms=duration_ms,
            success=bool(result.get("success")),
        )
        return result

    def context_for_call(self, call_id: str) -> VoiceExecutionContext:
        call = self.repo.get_call(call_id)
        if call is None:
            return VoiceExecutionContext.anonymous(call_id)
        return VoiceExecutionContext.from_call(call)

    def search_patient(self, arguments: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        matches = self.identity.search(
            phone=arguments.get("phone"),
            first_name=arguments.get("firstName") or arguments.get("first_name"),
            last_name=arguments.get("lastName") or arguments.get("last_name"),
            dob=arguments.get("dob"),
            record_number=arguments.get("recordNumber") or arguments.get("record_number"),
        )
        if not matches:
            return tool_err(PATIENT_NOT_FOUND, "No matching patient found", retryable=True)
        return tool_ok({"patients": matches, "count": len(matches)})

    def search_doctors(self, arguments: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        specialty = (arguments.get("specialty") or arguments.get("name") or "").strip().lower()
        doctors = self.doctors.list()
        if specialty:
            doctors = [
                d
                for d in doctors
                if specialty in d.specialty.lower()
                or specialty in d.last_name.lower()
                or specialty in d.first_name.lower()
            ]
        if not doctors:
            return tool_err(DOCTOR_NOT_FOUND, "No matching doctor found", retryable=True)
        return tool_ok(
            {
                "doctors": [
                    {
                        "id": d.id,
                        "name": f"Dr. {d.first_name} {d.last_name}",
                        "specialty": d.specialty,
                        "availability": d.availability,
                    }
                    for d in doctors[:8]
                ]
            }
        )

    def get_available_slots(self, arguments: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        duration = int(arguments.get("durationMin") or arguments.get("duration_min") or 30)
        limit = int(arguments.get("limit") or 3)
        slots = self.availability.list_slots(
            doctor_id=arguments.get("doctorId") or arguments.get("doctor_id"),
            specialty=arguments.get("specialty"),
            duration_min=duration,
            limit=max(1, min(limit, 6)),
        )
        if not slots:
            return tool_err(NO_AVAILABLE_SLOTS, "No available slots in the selected period", retryable=True)
        return tool_ok({"slots": slots})

    def get_patient_appointments(self, arguments: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        if not ctx.get("patient_verified"):
            return tool_err(PATIENT_NOT_VERIFIED, "Patient must be verified first")
        patient_id = arguments.get("patientId") or arguments.get("patient_id")
        if not patient_id:
            return tool_err(PATIENT_NOT_FOUND, "patientId is required")
        items = [
            {
                "id": a.id,
                "doctorId": a.doctor_id,
                "doctorName": a.doctor_name,
                "date": a.date,
                "durationMin": a.duration_min,
                "reason": a.reason,
                "status": a.status,
            }
            for a in self.appointments.list()
            if a.patient_id == patient_id and a.status in _ACTIVE_APPT
        ]
        return tool_ok({"appointments": items})

    def create_appointment(self, arguments: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        guard = assert_mutation_allowed(
            patient_verified=bool(ctx.get("patient_verified")),
            confirmation_received=bool(ctx.get("confirmation_received")),
            confirm_required=self.settings_svc.get_effective_settings().require_confirmation,
        )
        if guard:
            code = PATIENT_NOT_VERIFIED if guard.reason == "patient_not_verified" else CONFIRMATION_REQUIRED
            return tool_err(code, guard.spoken_en)

        doctor_id = arguments.get("doctorId") or arguments.get("doctor_id")
        date = arguments.get("date") or arguments.get("start")
        patient_id = arguments.get("patientId") or arguments.get("patient_id")
        duration = int(arguments.get("durationMin") or arguments.get("duration_min") or 30)
        if not doctor_id or not date or not patient_id:
            return tool_err("VALIDATION_ERROR", "doctorId, patientId and date are required")

        doctor = self.doctors.get(doctor_id)
        patient = self.patients.get(patient_id)
        if patient is None:
            return tool_err(PATIENT_NOT_FOUND, "Patient not found")

        if not self.availability.is_slot_free(doctor_id, date, duration):
            voice_metrics.inc("voice_booking_failure")
            return tool_err(
                APPOINTMENT_CONFLICT,
                "Selected slot is no longer available",
                retryable=True,
            )

        created = self.appointments.create(
            AppointmentCreate(
                patientId=patient.id,
                patientName=f"{patient.first_name} {patient.last_name}",
                doctorId=doctor.id,
                doctorName=f"Dr. {doctor.first_name} {doctor.last_name}",
                date=date,
                durationMin=duration,
                reason=arguments.get("reason") or "Voice booking",
                status="scheduled",
            )
        )
        voice_metrics.inc("voice_booking_success")
        return tool_ok(
            {
                "appointmentId": created.id,
                "date": created.date,
                "doctorName": created.doctor_name,
                "patientName": created.patient_name,
                "status": created.status,
            }
        )

    def reschedule_appointment(self, arguments: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        guard = assert_mutation_allowed(
            patient_verified=bool(ctx.get("patient_verified")),
            confirmation_received=bool(ctx.get("confirmation_received")),
            confirm_required=self.settings_svc.get_effective_settings().require_confirmation,
        )
        if guard:
            code = PATIENT_NOT_VERIFIED if guard.reason == "patient_not_verified" else CONFIRMATION_REQUIRED
            return tool_err(code, guard.spoken_en)

        appointment_id = arguments.get("appointmentId") or arguments.get("appointment_id")
        date = arguments.get("date") or arguments.get("start")
        patient_id = arguments.get("patientId") or arguments.get("patient_id")
        if not appointment_id or not date:
            return tool_err("VALIDATION_ERROR", "appointmentId and date are required")

        appointment = self.appointments.appointments.get(appointment_id)
        if appointment is None:
            return tool_err(APPOINTMENT_NOT_FOUND, "Appointment not found")
        if patient_id and appointment.patient_id != patient_id:
            return tool_err(OWNERSHIP_MISMATCH, "Appointment does not belong to this patient")
        if appointment.status not in _ACTIVE_APPT:
            return tool_err(APPOINTMENT_NOT_RESCHEDULABLE, "This appointment can no longer be moved")

        doctor_id = arguments.get("doctorId") or arguments.get("doctor_id") or appointment.doctor_id
        doctor = self.doctors.get(doctor_id)
        if not self.availability.is_slot_free(
            doctor_id,
            date,
            appointment.duration_min,
            ignore_appointment_id=appointment_id,
        ):
            return tool_err(APPOINTMENT_CONFLICT, "Selected slot is no longer available", retryable=True)

        updated = self.appointments.reschedule(
            appointment_id,
            doctor_id=doctor.id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            date=date,
        )
        return tool_ok(
            {
                "appointmentId": updated.id,
                "date": updated.date,
                "doctorName": updated.doctor_name,
                "status": updated.status,
            }
        )

    def cancel_appointment(self, arguments: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        guard = assert_mutation_allowed(
            patient_verified=bool(ctx.get("patient_verified")),
            confirmation_received=bool(ctx.get("confirmation_received")),
            confirm_required=self.settings_svc.get_effective_settings().require_confirmation,
        )
        if guard:
            code = PATIENT_NOT_VERIFIED if guard.reason == "patient_not_verified" else CONFIRMATION_REQUIRED
            return tool_err(code, guard.spoken_en)

        appointment_id = arguments.get("appointmentId") or arguments.get("appointment_id")
        patient_id = arguments.get("patientId") or arguments.get("patient_id")
        if not appointment_id:
            return tool_err("VALIDATION_ERROR", "appointmentId is required")
        appointment = self.appointments.appointments.get(appointment_id)
        if appointment is None:
            return tool_err(APPOINTMENT_NOT_FOUND, "Appointment not found")
        if patient_id and appointment.patient_id != patient_id:
            return tool_err(OWNERSHIP_MISMATCH, "Appointment does not belong to this patient")
        cancelled = self.appointments.cancel(appointment_id)
        return tool_ok({"appointmentId": cancelled.id, "status": cancelled.status})

    def send_confirmation(self, arguments: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        appointment_id = arguments.get("appointmentId") or arguments.get("appointment_id")
        if not appointment_id:
            return tool_err("VALIDATION_ERROR", "appointmentId is required")
        appointment = self.appointments.appointments.get(appointment_id)
        if appointment is None:
            return tool_err(APPOINTMENT_NOT_FOUND, "Appointment not found")
        patient = self.patients.get(appointment.patient_id)
        phone = normalize_phone(patient.phone if patient else None)
        if not phone:
            return tool_err(SMS_FAILED, "No valid phone number for SMS", retryable=False)
        body = (
            f"SIHIA: RDV {appointment.date} with {appointment.doctor_name}. "
            f"Status: {appointment.status}. Demo — synthetic data only."
        )
        try:
            send_sms(phone, body)
        except Exception as exc:  # noqa: BLE001
            return tool_err(SMS_FAILED, str(exc), retryable=True)
        return tool_ok({"channel": "sms", "to": phone, "appointmentId": appointment.id})

    def escalate_to_human(self, arguments: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        reason = arguments.get("reason") or "operator_request"
        effective = self.settings_svc.get_effective_settings()
        voice_metrics.inc("voice_escalations")
        return {
            "success": True,
            "code": HUMAN_ESCALATION_REQUESTED,
            "status": "ESCALATION_REQUESTED",
            "transfer_available": False,
            "data": {
                "status": "ESCALATION_REQUESTED",
                "transferAvailable": False,
                "transferStatus": "ESCALATION_REQUESTED",
                "reason": reason,
                "humanTransferConfigured": effective.human_transfer_configured,
            },
        }

    def _from_http(self, exc: HTTPException) -> dict[str, Any]:
        detail = exc.detail
        if isinstance(detail, dict):
            code = str(detail.get("code") or APPOINTMENT_CONFLICT)
            message = str(detail.get("message") or "Request failed")
        else:
            text = str(detail)
            if "CONFLICT" in text:
                code, message = APPOINTMENT_CONFLICT, "Selected slot is no longer available"
            elif "introuvable" in text.lower():
                code, message = APPOINTMENT_NOT_FOUND, text
            else:
                code, message = "HTTP_ERROR", text
        if exc.status_code == 409:
            voice_metrics.inc("voice_booking_failure")
        return tool_err(code, message, retryable=exc.status_code == 409)

    def _persist(
        self,
        call_id: str,
        tool_name: str,
        arguments: dict[str, Any],
        result: dict[str, Any],
        duration_ms: int,
    ) -> None:
        success = bool(result.get("success"))
        record = VoiceToolCall(
            id=f"vtc-{uuid4().hex[:12]}",
            call_id=call_id,
            tool_name=tool_name,
            arguments_json=minimize_tool_log(tool_name, arguments),
            result_json=minimize_tool_log(tool_name, result),
            success=success,
            error_code=None if success else result.get("code"),
            duration_ms=duration_ms,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            self.repo.add_tool_call(record)
        except Exception:
            pass
        voice_metrics.observe_tool_latency(duration_ms, success=success)
