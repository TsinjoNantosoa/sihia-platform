"""Catalogue des tools Voice — least privilege, résultats structurés."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

TOOL_NAMES = (
    "search_patient",
    "search_doctors",
    "get_available_slots",
    "get_patient_appointments",
    "create_appointment",
    "reschedule_appointment",
    "cancel_appointment",
    "send_confirmation",
    "escalate_to_human",
)

MUTATION_TOOLS = {
    "create_appointment",
    "reschedule_appointment",
    "cancel_appointment",
}


class ToolRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, Callable[..., dict[str, Any]]] = {}

    def register(self, name: str, handler: Callable[..., dict[str, Any]]) -> None:
        self._handlers[name] = handler

    def get(self, name: str) -> Callable[..., dict[str, Any]] | None:
        return self._handlers.get(name)

    def names(self) -> list[str]:
        return list(self._handlers)

    def openai_tools_schema(self) -> list[dict[str, Any]]:
        """Schéma function-calling pour GPT-4o-mini / ElevenLabs."""
        return [
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": name.replace("_", " "),
                    "parameters": {"type": "object", "additionalProperties": True},
                },
            }
            for name in self.names()
        ]
