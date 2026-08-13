from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.infrastructure.database import connect
from app.voice.models import VoiceCall, VoiceEvent, VoiceToolCall, VoiceTranscriptSegment


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _loads(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _row_to_call(row: dict[str, Any]) -> VoiceCall:
    return VoiceCall(
        id=row["id"],
        provider_call_id=row.get("provider_call_id"),
        conversation_id=row.get("conversation_id"),
        direction=row["direction"],
        phone_from=row["phone_from"],
        phone_to=row["phone_to"],
        patient_id=row.get("patient_id"),
        started_at=row["started_at"],
        answered_at=row.get("answered_at"),
        ended_at=row.get("ended_at"),
        duration_seconds=row.get("duration_seconds"),
        status=row["status"],
        intent=row.get("intent"),
        outcome=row.get("outcome"),
        language=row.get("language") or "en",
        escalated=bool(row.get("escalated")),
        escalation_reason=row.get("escalation_reason"),
        appointment_id=row.get("appointment_id"),
        created_at=row["created_at"],
        state=row.get("state") or "CALL_STARTED",
        identity_status=row.get("identity_status") or "unverified",
        context_json=_loads(row.get("context_json")),
    )


class VoiceRepository:
    def create_call(self, call: VoiceCall) -> VoiceCall:
        conn = connect()
        conn.execute(
            """
            INSERT INTO voice_calls (
                id, provider_call_id, conversation_id, direction, phone_from, phone_to,
                patient_id, started_at, answered_at, ended_at, duration_seconds, status,
                intent, outcome, language, escalated, escalation_reason, appointment_id,
                state, identity_status, context_json, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                call.id,
                call.provider_call_id,
                call.conversation_id,
                call.direction,
                call.phone_from,
                call.phone_to,
                call.patient_id,
                call.started_at,
                call.answered_at,
                call.ended_at,
                call.duration_seconds,
                call.status,
                call.intent,
                call.outcome,
                call.language,
                1 if call.escalated else 0,
                call.escalation_reason,
                call.appointment_id,
                call.state,
                call.identity_status,
                json.dumps(call.context_json),
                call.created_at,
            ),
        )
        conn.commit()
        conn.close()
        return call

    def get_call(self, call_id: str) -> VoiceCall | None:
        conn = connect()
        row = conn.execute("SELECT * FROM voice_calls WHERE id=?", (call_id,)).fetchone()
        conn.close()
        return _row_to_call(row) if row else None

    def get_by_provider_id(self, provider_call_id: str) -> VoiceCall | None:
        conn = connect()
        row = conn.execute(
            "SELECT * FROM voice_calls WHERE provider_call_id=?",
            (provider_call_id,),
        ).fetchone()
        conn.close()
        return _row_to_call(row) if row else None

    def update_call(self, call: VoiceCall) -> VoiceCall:
        conn = connect()
        conn.execute(
            """
            UPDATE voice_calls SET
                provider_call_id=?, conversation_id=?, patient_id=?, answered_at=?,
                ended_at=?, duration_seconds=?, status=?, intent=?, outcome=?,
                language=?, escalated=?, escalation_reason=?, appointment_id=?,
                state=?, identity_status=?, context_json=?
            WHERE id=?
            """,
            (
                call.provider_call_id,
                call.conversation_id,
                call.patient_id,
                call.answered_at,
                call.ended_at,
                call.duration_seconds,
                call.status,
                call.intent,
                call.outcome,
                call.language,
                1 if call.escalated else 0,
                call.escalation_reason,
                call.appointment_id,
                call.state,
                call.identity_status,
                json.dumps(call.context_json),
                call.id,
            ),
        )
        conn.commit()
        conn.close()
        return call

    def list_calls(self, *, limit: int = 50, offset: int = 0) -> list[VoiceCall]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM voice_calls ORDER BY started_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        conn.close()
        return [_row_to_call(r) for r in rows]

    def add_event(self, call_id: str, event_type: str, payload: dict[str, Any] | None = None) -> VoiceEvent:
        event = VoiceEvent(
            id=f"ve-{uuid4().hex[:12]}",
            call_id=call_id,
            event_type=event_type,
            timestamp=_now(),
            payload_json=payload or {},
        )
        conn = connect()
        conn.execute(
            "INSERT INTO voice_events (id, call_id, event_type, timestamp, payload_json) VALUES (?,?,?,?,?)",
            (event.id, call_id, event_type, event.timestamp, json.dumps(event.payload_json)),
        )
        conn.commit()
        conn.close()
        return event

    def list_events(self, call_id: str) -> list[VoiceEvent]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM voice_events WHERE call_id=? ORDER BY timestamp ASC",
            (call_id,),
        ).fetchall()
        conn.close()
        return [
            VoiceEvent(
                id=r["id"],
                call_id=r["call_id"],
                event_type=r["event_type"],
                timestamp=r["timestamp"],
                payload_json=_loads(r.get("payload_json")),
            )
            for r in rows
        ]

    def add_tool_call(self, record: VoiceToolCall) -> VoiceToolCall:
        conn = connect()
        conn.execute(
            """
            INSERT INTO voice_tool_calls (
                id, call_id, tool_name, arguments_json, result_json, success, error_code, duration_ms, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                record.id,
                record.call_id,
                record.tool_name,
                json.dumps(record.arguments_json),
                json.dumps(record.result_json),
                1 if record.success else 0,
                record.error_code,
                record.duration_ms,
                record.created_at,
            ),
        )
        conn.commit()
        conn.close()
        return record

    def list_tool_calls(self, call_id: str) -> list[VoiceToolCall]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM voice_tool_calls WHERE call_id=? ORDER BY created_at ASC",
            (call_id,),
        ).fetchall()
        conn.close()
        return [
            VoiceToolCall(
                id=r["id"],
                call_id=r["call_id"],
                tool_name=r["tool_name"],
                arguments_json=_loads(r.get("arguments_json")),
                result_json=_loads(r.get("result_json")),
                success=bool(r.get("success")),
                error_code=r.get("error_code"),
                duration_ms=int(r.get("duration_ms") or 0),
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def add_transcript(
        self,
        call_id: str,
        speaker: str,
        content: str,
        *,
        started_at: str | None = None,
        ended_at: str | None = None,
    ) -> VoiceTranscriptSegment:
        conn = connect()
        row = conn.execute(
            "SELECT COALESCE(MAX(sequence_number), 0) AS m FROM voice_transcript_segments WHERE call_id=?",
            (call_id,),
        ).fetchone()
        seq = int(row["m"] if row else 0) + 1
        segment = VoiceTranscriptSegment(
            id=f"vt-{uuid4().hex[:12]}",
            call_id=call_id,
            speaker=speaker,  # type: ignore[arg-type]
            content=content,
            started_at=started_at,
            ended_at=ended_at,
            sequence_number=seq,
        )
        conn.execute(
            """
            INSERT INTO voice_transcript_segments
                (id, call_id, speaker, content, started_at, ended_at, sequence_number)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                segment.id,
                call_id,
                speaker,
                content,
                started_at,
                ended_at,
                seq,
            ),
        )
        conn.commit()
        conn.close()
        return segment

    def list_transcript(self, call_id: str) -> list[VoiceTranscriptSegment]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM voice_transcript_segments WHERE call_id=? ORDER BY sequence_number ASC",
            (call_id,),
        ).fetchall()
        conn.close()
        return [
            VoiceTranscriptSegment(
                id=r["id"],
                call_id=r["call_id"],
                speaker=r["speaker"],
                content=r["content"],
                started_at=r.get("started_at"),
                ended_at=r.get("ended_at"),
                sequence_number=int(r["sequence_number"]),
            )
            for r in rows
        ]

    def get_idempotent(self, key: str) -> dict[str, Any] | None:
        conn = connect()
        row = conn.execute("SELECT result_json FROM voice_idempotency_keys WHERE id=?", (key,)).fetchone()
        conn.close()
        if not row:
            return None
        return _loads(row.get("result_json"))

    def put_idempotent(self, key: str, result: dict[str, Any]) -> None:
        conn = connect()
        conn.execute(
            "INSERT INTO voice_idempotency_keys (id, result_json, created_at) VALUES (?,?,?)",
            (key, json.dumps(result), _now()),
        )
        conn.commit()
        conn.close()

    def stats_today(self, day_prefix: str) -> dict[str, Any]:
        conn = connect()
        rows = conn.execute(
            "SELECT status, outcome, escalated, duration_seconds FROM voice_calls WHERE started_at LIKE ?",
            (f"{day_prefix}%",),
        ).fetchall()
        latency = conn.execute(
            "SELECT AVG(duration_ms) AS avg_ms FROM voice_tool_calls",
        ).fetchone()
        conn.close()
        completed = sum(1 for r in rows if r["status"] == "completed")
        booked = sum(1 for r in rows if r.get("outcome") == "booked")
        rescheduled = sum(1 for r in rows if r.get("outcome") == "rescheduled")
        cancelled = sum(1 for r in rows if r.get("outcome") == "cancelled")
        escalations = sum(1 for r in rows if r.get("escalated"))
        failed = sum(1 for r in rows if r.get("status") in {"failed", "no_answer", "busy"} or r.get("outcome") == "failed")
        durations = [int(r["duration_seconds"]) for r in rows if r.get("duration_seconds")]
        avg_dur = round(sum(durations) / len(durations), 1) if durations else 0.0
        avg_lat = float(latency["avg_ms"] or 0) if latency else 0.0
        return {
            "callsToday": len(rows),
            "completedCalls": completed,
            "appointmentsBooked": booked,
            "appointmentsRescheduled": rescheduled,
            "appointmentsCancelled": cancelled,
            "humanEscalations": escalations,
            "failedCalls": failed,
            "averageCallDuration": avg_dur,
            "averageToolLatency": round(avg_lat, 1),
        }

    def get_settings(self) -> dict[str, Any] | None:
        conn = connect()
        row = conn.execute("SELECT * FROM voice_settings WHERE id=?", ("default",)).fetchone()
        conn.close()
        return dict(row) if row else None

    def upsert_settings(self, values: dict[str, Any]) -> dict[str, Any]:
        current = self.get_settings() or {
            "id": "default",
            "agent_enabled": 1,
            "inbound_enabled": 1,
            "outbound_enabled": 0,
            "default_language": "en",
            "supported_languages": "en,fr",
            "quiet_hours_start": None,
            "quiet_hours_end": None,
            "max_retries": 2,
            "silence_timeout_seconds": 8,
            "require_confirmation": 1,
            "store_transcripts": 1,
            "store_audio": 0,
        }
        current.update(values)
        current["id"] = "default"
        current["updated_at"] = _now()
        return self._replace_settings(current)

    def _replace_settings(self, current: dict[str, Any]) -> dict[str, Any]:
        conn = connect()
        existing = conn.execute("SELECT id FROM voice_settings WHERE id=?", ("default",)).fetchone()
        params = (
            int(current["agent_enabled"]),
            int(current["inbound_enabled"]),
            int(current["outbound_enabled"]),
            current["default_language"],
            current["supported_languages"],
            current.get("quiet_hours_start"),
            current.get("quiet_hours_end"),
            int(current["max_retries"]),
            int(current["silence_timeout_seconds"]),
            int(current["require_confirmation"]),
            int(current["store_transcripts"]),
            int(current["store_audio"]),
            current["updated_at"],
            "default",
        )
        if existing:
            conn.execute(
                """
                UPDATE voice_settings SET
                    agent_enabled=?, inbound_enabled=?, outbound_enabled=?, default_language=?,
                    supported_languages=?, quiet_hours_start=?, quiet_hours_end=?, max_retries=?,
                    silence_timeout_seconds=?, require_confirmation=?, store_transcripts=?,
                    store_audio=?, updated_at=?
                WHERE id=?
                """,
                params,
            )
        else:
            conn.execute(
                """
                INSERT INTO voice_settings (
                    id, agent_enabled, inbound_enabled, outbound_enabled, default_language,
                    supported_languages, quiet_hours_start, quiet_hours_end, max_retries,
                    silence_timeout_seconds, require_confirmation, store_transcripts, store_audio, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                ("default",) + params[:-1],
            )
        conn.commit()
        conn.close()
        return current
