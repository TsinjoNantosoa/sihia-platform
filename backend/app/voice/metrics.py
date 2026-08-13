"""Compteurs Voice AI en mémoire (health + dashboard)."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock


@dataclass
class VoiceMetrics:
    voice_calls_total: int = 0
    voice_calls_completed: int = 0
    voice_booking_success: int = 0
    voice_booking_failure: int = 0
    voice_escalations: int = 0
    voice_tool_calls: int = 0
    voice_tool_errors: int = 0
    voice_barge_in_count: int = 0
    voice_duration_sum: int = 0
    voice_duration_count: int = 0
    voice_tool_latency_sum: int = 0
    voice_tool_latency_count: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def inc(self, name: str, amount: int = 1) -> None:
        with self._lock:
            setattr(self, name, getattr(self, name, 0) + amount)

    def observe_duration(self, seconds: int) -> None:
        with self._lock:
            self.voice_duration_sum += max(seconds, 0)
            self.voice_duration_count += 1

    def observe_tool_latency(self, duration_ms: int, *, success: bool) -> None:
        with self._lock:
            self.voice_tool_calls += 1
            if not success:
                self.voice_tool_errors += 1
            self.voice_tool_latency_sum += max(duration_ms, 0)
            self.voice_tool_latency_count += 1

    def snapshot(self) -> dict[str, float | int]:
        with self._lock:
            avg_duration = (
                round(self.voice_duration_sum / self.voice_duration_count, 1)
                if self.voice_duration_count
                else 0
            )
            avg_latency = (
                round(self.voice_tool_latency_sum / self.voice_tool_latency_count, 1)
                if self.voice_tool_latency_count
                else 0
            )
            return {
                "voice_calls_total": self.voice_calls_total,
                "voice_calls_completed": self.voice_calls_completed,
                "voice_booking_success": self.voice_booking_success,
                "voice_booking_failure": self.voice_booking_failure,
                "voice_escalations": self.voice_escalations,
                "voice_tool_calls": self.voice_tool_calls,
                "voice_tool_errors": self.voice_tool_errors,
                "voice_barge_in_count": self.voice_barge_in_count,
                "voice_average_duration": avg_duration,
                "voice_average_tool_latency": avg_latency,
            }


voice_metrics = VoiceMetrics()
