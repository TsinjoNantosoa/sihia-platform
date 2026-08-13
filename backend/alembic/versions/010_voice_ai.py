"""Tables Voice AI (appels, events, tools, transcripts, idempotence, settings).

Revision ID: 010
Revises: 009
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voice_calls",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("provider_call_id", sa.Text(), nullable=True),
        sa.Column("conversation_id", sa.Text(), nullable=True),
        sa.Column("direction", sa.Text(), nullable=False),
        sa.Column("phone_from", sa.Text(), nullable=False),
        sa.Column("phone_to", sa.Text(), nullable=False),
        sa.Column("patient_id", sa.Text(), nullable=True),
        sa.Column("started_at", sa.Text(), nullable=False),
        sa.Column("answered_at", sa.Text(), nullable=True),
        sa.Column("ended_at", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("intent", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("escalated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("escalation_reason", sa.Text(), nullable=True),
        sa.Column("appointment_id", sa.Text(), nullable=True),
        sa.Column("state", sa.Text(), nullable=False, server_default="CALL_STARTED"),
        sa.Column("identity_status", sa.Text(), nullable=False, server_default="unverified"),
        sa.Column("context_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_voice_calls_started", "voice_calls", ["started_at"])
    op.create_index("ix_voice_calls_provider", "voice_calls", ["provider_call_id"])
    op.create_index("ix_voice_calls_patient", "voice_calls", ["patient_id"])

    op.create_table(
        "voice_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("call_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_voice_events_call", "voice_events", ["call_id"])

    op.create_table(
        "voice_tool_calls",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("call_id", sa.Text(), nullable=False),
        sa.Column("tool_name", sa.Text(), nullable=False),
        sa.Column("arguments_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("success", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_voice_tool_calls_call", "voice_tool_calls", ["call_id"])

    op.create_table(
        "voice_transcript_segments",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("call_id", sa.Text(), nullable=False),
        sa.Column("speaker", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("started_at", sa.Text(), nullable=True),
        sa.Column("ended_at", sa.Text(), nullable=True),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
    )
    op.create_index("ix_voice_transcript_call", "voice_transcript_segments", ["call_id"])

    op.create_table(
        "voice_idempotency_keys",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("result_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
    )

    op.create_table(
        "voice_settings",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("agent_enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("inbound_enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("outbound_enabled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("default_language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("supported_languages", sa.Text(), nullable=False, server_default="en,fr"),
        sa.Column("quiet_hours_start", sa.Text(), nullable=True),
        sa.Column("quiet_hours_end", sa.Text(), nullable=True),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("silence_timeout_seconds", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("require_confirmation", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("store_transcripts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("store_audio", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("voice_settings")
    op.drop_table("voice_idempotency_keys")
    op.drop_index("ix_voice_transcript_call", table_name="voice_transcript_segments")
    op.drop_table("voice_transcript_segments")
    op.drop_index("ix_voice_tool_calls_call", table_name="voice_tool_calls")
    op.drop_table("voice_tool_calls")
    op.drop_index("ix_voice_events_call", table_name="voice_events")
    op.drop_table("voice_events")
    op.drop_index("ix_voice_calls_patient", table_name="voice_calls")
    op.drop_index("ix_voice_calls_provider", table_name="voice_calls")
    op.drop_index("ix_voice_calls_started", table_name="voice_calls")
    op.drop_table("voice_calls")
