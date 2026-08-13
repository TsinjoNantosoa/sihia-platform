"""Orchestrateur conversationnel mock + GPT optionnel — le LLM n'est pas source de vérité."""

from __future__ import annotations

import re
from typing import Any

from app.core.config import settings
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.call_service import CallService
from app.voice.metrics import voice_metrics
from app.voice.models import VoiceCall
from app.voice.prompts import system_prompt
from app.voice.safety import evaluate_voice_safety
from app.voice.tools import VoiceTools


_BOOK = re.compile(r"\b(book|appointment|rendez[- ]?vous|prendre|cardiolog|slot|disponible)\b", re.I)
_CANCEL = re.compile(r"\b(cancel|annul)\b", re.I)
_RESCHEDULE = re.compile(r"\b(reschedul|déplac|deplac|move|change)\b", re.I)
_YES = re.compile(r"\b(yes|oui|confirm|ok|d'accord|daccord|sure)\b", re.I)
_NO = re.compile(r"\b(no|non|stop)\b", re.I)


class AgentService:
    def __init__(self, calls: CallService, tools: VoiceTools, repo: VoiceRepository) -> None:
        self.calls = calls
        self.tools = tools
        self.repo = repo

    def handle_turn(
        self,
        *,
        text: str,
        call: VoiceCall | None = None,
        phone_from: str | None = None,
        language: str | None = None,
        barge_in: bool = False,
    ) -> dict[str, Any]:
        lang = (language or (call.language if call else None) or settings.voice_default_language).lower()
        if call is None:
            call = self.calls.start_call(
                direction="inbound",
                phone_from=phone_from or "+212600000000",
                phone_to=settings.twilio_from_number or "+212600000001",
                language=lang,
            )
            call = self.calls.set_state(call, "DISCLOSURE")
            self._say(call, self._disclosure(lang), lang)

        if barge_in:
            voice_metrics.inc("voice_barge_in_count")
            self.repo.add_event(call.id, "barge_in", {"text": text[:200]})
            call.context_json["lastBargeIn"] = text[:200]
            self.repo.update_call(call)

        self._say(call, text, lang, speaker="patient")
        safety = evaluate_voice_safety(text, lang)
        if safety.kind == "emergency":
            call = self.calls.set_state(call, "EMERGENCY_EXIT")
            reply = safety.spoken(lang)
            self._say(call, reply, lang)
            call = self.calls.end_call(call, outcome="failed")
            return self._turn(call, reply, [], True)
        if safety.escalate:
            return self._escalate(call, text, lang, safety.spoken(lang))
        if safety.blocked:
            reply = safety.spoken(lang)
            self._say(call, reply, lang)
            return self._turn(call, reply, [], False)

        if call.state in {"CALL_STARTED", "DISCLOSURE"}:
            call = self.calls.set_state(call, "IDENTIFY_INTENT")

        tool_results: list[dict[str, Any]] = []
        intent = self._intent(text, call)
        if intent:
            call.intent = intent
            self.repo.update_call(call)

        reply = self._advance(call, text, lang, tool_results)
        ended = call.state in {"END", "CALL_ENDED", "HUMAN_ESCALATION", "EMERGENCY_EXIT"}
        return self._turn(call, reply, tool_results, ended)

    def _advance(self, call: VoiceCall, text: str, lang: str, tool_results: list[dict[str, Any]]) -> str:
        ctx = call.context_json
        verified = call.identity_status == "verified"

        if call.state == "IDENTIFY_INTENT":
            if call.intent == "cancel":
                call = self.calls.set_state(call, "IDENTIFY_PATIENT")
            elif call.intent == "reschedule":
                call = self.calls.set_state(call, "IDENTIFY_PATIENT")
            else:
                call.intent = call.intent or "book"
                call = self.calls.set_state(call, "IDENTIFY_PATIENT")
            return self._identify_patient(call, text, lang, tool_results)

        if call.state == "IDENTIFY_PATIENT":
            return self._identify_patient(call, text, lang, tool_results)

        if call.state == "VERIFY_PATIENT":
            return self._verify(call, text, lang, tool_results)

        if call.state == "SELECT_WORKFLOW":
            workflow = {"book": "BOOK", "reschedule": "RESCHEDULE", "cancel": "CANCEL"}.get(call.intent or "book", "BOOK")
            call = self.calls.set_state(call, workflow)
            if workflow == "BOOK":
                call = self.calls.set_state(call, "SEARCH")
                return self._search_slots(call, text, lang, tool_results)
            if workflow == "CANCEL":
                return self._list_appointments(call, lang, tool_results)
            return self._list_appointments(call, lang, tool_results)

        if call.state in {"BOOK", "SEARCH"}:
            return self._search_slots(call, text, lang, tool_results)

        if call.state == "PROPOSE":
            chosen = self._pick_slot(text, ctx.get("proposedSlots") or [])
            if chosen:
                ctx["selectedSlot"] = chosen
                call.context_json = ctx
                call = self.calls.set_state(call, "CONFIRM")
                label = chosen.get("label") or chosen.get("start")
                return self._speak(
                    call,
                    lang,
                    f"Confirm {label} with {chosen.get('doctorName')}?",
                    f"Je confirme {label} avec {chosen.get('doctorName')} ?",
                )
            return self._search_slots(call, text, lang, tool_results)

        if call.state == "CONFIRM":
            if _YES.search(text):
                call = self.calls.set_state(call, "COMMIT")
                return self._commit(call, lang, tool_results)
            if _NO.search(text):
                call = self.calls.set_state(call, "SEARCH")
                return self._search_slots(call, text, lang, tool_results)
            return self._speak(call, lang, "Please say yes to confirm, or no to choose another slot.", "Dites oui pour confirmer, ou non pour un autre créneau.")

        if call.state in {"CANCEL", "RESCHEDULE", "SELECT"}:
            return self._handle_existing(call, text, lang, tool_results)

        if call.state == "COMMIT":
            return self._commit(call, lang, tool_results)

        return self._speak(call, lang, "How can I help with an appointment?", "Comment puis-je aider pour un rendez-vous ?")

    def _identify_patient(self, call: VoiceCall, text: str, lang: str, tool_results: list[dict[str, Any]]) -> str:
        args: dict[str, Any] = {"phone": call.phone_from}
        last = self._extract_last_name(text)
        if last:
            args["lastName"] = last
        result = self.tools.invoke("search_patient", args, call_id=call.id)
        tool_results.append(result)
        patients = (result.get("data") or {}).get("patients") if result.get("success") else []
        if not patients:
            call = self.calls.set_state(call, "IDENTIFY_PATIENT")
            return self._speak(
                call,
                lang,
                "I could not find your record. Please say your last name.",
                "Je n'ai pas trouvé votre dossier. Pouvez-vous me donner votre nom de famille ?",
            )
        patient = patients[0]
        call.patient_id = patient["id"]
        call.identity_status = "partial"
        self.repo.add_event(call.id, "patient.identified", {"patientId": patient["id"]})
        call = self.calls.set_state(call, "VERIFY_PATIENT")
        self.repo.update_call(call)
        return self._speak(
            call,
            lang,
            f"I found a record for {patient['firstName']}. Please confirm your last name and date of birth.",
            f"J'ai trouvé un dossier pour {patient['firstName']}. Confirmez votre nom et date de naissance.",
        )

    def _verify(self, call: VoiceCall, text: str, lang: str, tool_results: list[dict[str, Any]]) -> str:
        last = self._extract_last_name(text) or call.context_json.get("verifyLastName")
        dob = self._extract_dob(text)
        ok, _patient = self.tools.identity.verify(
            call.patient_id or "",
            last_name=last,
            dob=dob,
            phone=call.phone_from if not last and not dob else None,
        )
        if not ok and last:
            ok, _patient = self.tools.identity.verify(call.patient_id or "", last_name=last)
        if not ok:
            retries = int(call.context_json.get("verifyRetries") or 0) + 1
            call.context_json["verifyRetries"] = retries
            self.repo.update_call(call)
            if retries >= settings.voice_max_retries:
                call.identity_status = "failed"
                return self._escalate(call, text, lang, None)["reply"]
            return self._speak(
                call,
                lang,
                "I could not verify that. Please repeat your last name.",
                "Je n'ai pas pu vérifier. Répétez votre nom de famille.",
            )
        call.identity_status = "verified"
        self.repo.add_event(call.id, "patient.verified", {"patientId": call.patient_id})
        self.repo.update_call(call)
        call = self.calls.set_state(call, "SELECT_WORKFLOW")
        tool_results.append({"success": True, "data": {"verified": True, "patientId": call.patient_id}})
        return self._advance(call, text, lang, tool_results)

    def _search_slots(self, call: VoiceCall, text: str, lang: str, tool_results: list[dict[str, Any]]) -> str:
        specialty = call.context_json.get("specialty") or self._specialty(text) or "cardiolog"
        call.context_json["specialty"] = specialty
        result = self.tools.invoke(
            "get_available_slots",
            {"specialty": specialty, "limit": 3},
            call_id=call.id,
            patient_verified=call.identity_status == "verified",
        )
        tool_results.append(result)
        if not result.get("success"):
            call = self.calls.set_state(call, "HUMAN_ESCALATION")
            return self._speak(
                call,
                lang,
                "I don't have an open slot right now. I can transfer you to a person.",
                "Aucun créneau n'est disponible. Je peux vous transférer.",
            )
        slots = result["data"]["slots"]
        call.context_json["proposedSlots"] = slots
        call = self.calls.set_state(call, "PROPOSE")
        self.repo.update_call(call)
        labels = "; ".join(s.get("label") or s.get("start", "") for s in slots[:3])
        return self._speak(
            call,
            lang,
            f"I have {labels}. Which one works for you?",
            f"J'ai {labels}. Lequel vous convient ?",
        )

    def _commit(self, call: VoiceCall, lang: str, tool_results: list[dict[str, Any]]) -> str:
        slot = call.context_json.get("selectedSlot") or {}
        if call.intent == "cancel":
            appt_id = call.context_json.get("selectedAppointmentId")
            result = self.tools.invoke(
                "cancel_appointment",
                {"appointmentId": appt_id, "patientId": call.patient_id, "actionId": "cancel-1"},
                call_id=call.id,
                patient_verified=True,
                confirmation_received=True,
            )
            tool_results.append(result)
            if result.get("success"):
                call.appointment_id = appt_id
                call.outcome = "cancelled"
                self.repo.update_call(call)
                sms = self.tools.invoke("send_confirmation", {"appointmentId": appt_id}, call_id=call.id)
                tool_results.append(sms)
                call = self.calls.set_state(call, "SEND_CONFIRMATION")
                call = self.calls.end_call(call, outcome="cancelled")
                return self._speak(call, lang, "Your appointment is cancelled.", "Votre rendez-vous est annulé.")
            return self._speak(call, lang, result.get("message") or "I could not cancel.", result.get("message") or "Annulation impossible.")

        result = self.tools.invoke(
            "create_appointment" if call.intent != "reschedule" else "reschedule_appointment",
            {
                "doctorId": slot.get("doctorId"),
                "date": slot.get("start"),
                "patientId": call.patient_id,
                "reason": "Voice AI",
                "appointmentId": call.context_json.get("selectedAppointmentId"),
                "actionId": "commit-1",
            },
            call_id=call.id,
            patient_verified=True,
            confirmation_received=True,
        )
        tool_results.append(result)
        if not result.get("success"):
            if result.get("code") == "APPOINTMENT_CONFLICT":
                call = self.calls.set_state(call, "SEARCH")
                extra = self._speak(
                    call,
                    lang,
                    "That slot was just taken. Let me offer another one.",
                    "Ce créneau vient d'être pris. Je vous en propose un autre.",
                )
                more = self._search_slots(call, "", lang, tool_results)
                return extra + " " + more
            return self._speak(call, lang, result.get("message") or "I could not complete that.", "Je n'ai pas pu terminer.")

        appt_id = result["data"].get("appointmentId")
        call.appointment_id = appt_id
        call.outcome = "rescheduled" if call.intent == "reschedule" else "booked"
        self.repo.add_event(call.id, "appointment.confirmed", {"appointmentId": appt_id})
        self.repo.update_call(call)
        sms = self.tools.invoke("send_confirmation", {"appointmentId": appt_id}, call_id=call.id)
        tool_results.append(sms)
        call = self.calls.set_state(call, "SEND_CONFIRMATION")
        call = self.calls.end_call(call, outcome=call.outcome)
        when = result["data"].get("date")
        return self._speak(
            call,
            lang,
            f"Your appointment is confirmed for {when}. A confirmation SMS will be sent.",
            f"Votre rendez-vous est confirmé pour {when}. Un SMS de confirmation sera envoyé.",
        )

    def _list_appointments(self, call: VoiceCall, lang: str, tool_results: list[dict[str, Any]]) -> str:
        result = self.tools.invoke(
            "get_patient_appointments",
            {"patientId": call.patient_id},
            call_id=call.id,
            patient_verified=True,
        )
        tool_results.append(result)
        items = (result.get("data") or {}).get("appointments") or []
        if not items:
            return self._speak(call, lang, "I don't see an upcoming appointment.", "Je ne vois pas de rendez-vous à venir.")
        first = items[0]
        call.context_json["selectedAppointmentId"] = first["id"]
        if call.intent == "cancel":
            call = self.calls.set_state(call, "CONFIRM")
            self.repo.update_call(call)
            return self._speak(
                call,
                lang,
                f"Cancel your appointment on {first['date']} with {first['doctorName']}?",
                f"Annuler le rendez-vous du {first['date']} avec {first['doctorName']} ?",
            )
        call = self.calls.set_state(call, "SEARCH")
        self.repo.update_call(call)
        return self._search_slots(call, "", lang, tool_results)

    def _handle_existing(self, call: VoiceCall, text: str, lang: str, tool_results: list[dict[str, Any]]) -> str:
        return self._list_appointments(call, lang, tool_results)

    def _escalate(self, call: VoiceCall, text: str, lang: str, spoken: str | None) -> dict[str, Any]:
        result = self.tools.invoke("escalate_to_human", {"reason": "operator_request"}, call_id=call.id)
        call.escalated = True
        call.escalation_reason = "operator_request"
        call.outcome = "escalated"
        self.repo.add_event(call.id, "escalation.started", {"reason": "operator_request"})
        call = self.calls.set_state(call, "HUMAN_ESCALATION")
        call = self.calls.end_call(call, outcome="escalated")
        reply = spoken or (
            "I am transferring you to a staff member."
            if not lang.startswith("fr")
            else "Je vous transfère vers un conseiller."
        )
        self._say(call, reply, lang)
        return self._turn(call, reply, [result], True)

    def _intent(self, text: str, call: VoiceCall) -> str | None:
        if _CANCEL.search(text):
            return "cancel"
        if _RESCHEDULE.search(text):
            return "reschedule"
        if _BOOK.search(text) or call.intent:
            return call.intent or "book"
        return call.intent

    def _specialty(self, text: str) -> str | None:
        lowered = text.lower()
        for key in ("cardiolog", "pediatr", "dermat", "general"):
            if key in lowered:
                return key
        return None

    def _extract_last_name(self, text: str) -> str | None:
        match = re.search(r"\b(?:name|nom)\s+(?:is|est|:)?\s*([A-Za-zÀ-ÿ\-']{2,})", text, re.I)
        if match:
            return match.group(1)
        tokens = [t for t in re.findall(r"[A-Za-zÀ-ÿ']{2,}", text) if t.lower() not in {"yes", "oui", "my", "name", "is", "nom", "est", "born", "le"}]
        if len(tokens) == 1:
            return tokens[0]
        return tokens[-1] if tokens and not _YES.search(text) and not _BOOK.search(text) else None

    def _extract_dob(self, text: str) -> str | None:
        match = re.search(r"(19|20)\d{2}-\d{2}-\d{2}", text)
        return match.group(0) if match else None

    def _pick_slot(self, text: str, slots: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not slots:
            return None
        lowered = text.lower()
        for slot in slots:
            label = str(slot.get("label") or "").lower()
            start = str(slot.get("start") or "")
            if any(token in lowered for token in label.split() if len(token) > 2):
                return slot
            if "monday" in lowered and "lun" in label:
                return slot
            if "tuesday" in lowered or "mardi" in lowered:
                if "mar" in label:
                    return slot
            if "10" in lowered and "10" in (label + start):
                return slot
            if "14" in lowered or "2 pm" in lowered or "14 h" in lowered:
                if "14" in (label + start):
                    return slot
        if _YES.search(text) or "first" in lowered or "premier" in lowered:
            return slots[0]
        if "second" in lowered or "deuxième" in lowered or "deuxieme" in lowered:
            return slots[1] if len(slots) > 1 else slots[0]
        # barge-in short answers like "Tuesday"
        if len(text.split()) <= 3 and slots:
            for slot in slots:
                if any(w in str(slot.get("label") or "").lower() for w in lowered.split()):
                    return slot
        return None

    def _disclosure(self, lang: str) -> str:
        if lang.startswith("fr"):
            return "Bonjour, je suis l'assistant vocal automatisé SIHIA pour les rendez-vous. Comment puis-je aider ?"
        return "Hello, I am the SIHIA automated voice assistant for appointments. How can I help?"

    def _speak(self, call: VoiceCall, lang: str, en: str, fr: str) -> str:
        reply = fr if lang.startswith("fr") else en
        self._say(call, reply, lang)
        return reply

    def _say(self, call: VoiceCall, text: str, lang: str, speaker: str = "agent") -> None:
        if not settings.voice_store_transcripts:
            return
        self.repo.add_transcript(call.id, speaker, text)

    def _turn(self, call: VoiceCall, reply: str, tool_results: list[dict[str, Any]], ended: bool) -> dict[str, Any]:
        return {
            "callId": call.id,
            "state": call.state,
            "reply": reply,
            "toolResults": tool_results,
            "ended": ended,
            "outcome": call.outcome,
            "systemPrompt": system_prompt() if settings.environment != "production" else None,
        }
