"""Persistance des exécutions pipeline et snapshots."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import text

from app.infrastructure.database import connect, get_engine


def _write(sql: str, params: tuple | dict) -> None:
    """Ecriture compatible SQLAlchemy 1.4 / 2.x (Airflow Docker)."""
    with get_engine().begin() as conn:
        if isinstance(params, dict):
            conn.execute(text(sql), params)
        else:
            named: dict[str, Any] = {f"p{i}": v for i, v in enumerate(params)}
            parts = sql.split("?")
            rebuilt = parts[0]
            for i in range(len(params)):
                rebuilt += f":p{i}" + parts[i + 1]
            conn.execute(text(rebuilt), named)


class PipelineRepository:
    def start_run(self, dag_id: str) -> str:
        run_id = f"run-{uuid4().hex[:12]}"
        _write(
            """
            INSERT INTO pipeline_runs (id, dag_id, status, started_at, metrics)
            VALUES (?, ?, 'running', ?, '{}')
            """,
            (run_id, dag_id, datetime.now(timezone.utc).isoformat()),
        )
        return run_id

    def finish_run(
        self,
        run_id: str,
        *,
        status: str,
        metrics: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        _write(
            """
            UPDATE pipeline_runs
            SET status=?, finished_at=?, metrics=?, error=?
            WHERE id=?
            """,
            (
                status,
                datetime.now(timezone.utc).isoformat(),
                json.dumps(metrics or {}, ensure_ascii=False),
                error,
                run_id,
            ),
        )

    def latest_by_dag(self, dag_id: str) -> dict[str, Any] | None:
        conn = connect()
        row = conn.execute(
            """
            SELECT * FROM pipeline_runs
            WHERE dag_id=?
            ORDER BY started_at DESC
            LIMIT 1
            """,
            (dag_id,),
        ).fetchone()
        conn.close()
        if not row:
            return None
        item = dict(row)
        item["metrics"] = json.loads(item.get("metrics") or "{}")
        return item

    def list_recent(self, *, limit: int = 20) -> list[dict[str, Any]]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        conn.close()
        out: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["metrics"] = json.loads(item.get("metrics") or "{}")
            out.append(item)
        return out

    def save_snapshot(self, snapshot_key: str, payload: dict[str, Any]) -> None:
        _write(
            """
            INSERT INTO analytics_snapshots (id, snapshot_key, payload, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                f"snap-{uuid4().hex[:10]}",
                snapshot_key,
                json.dumps(payload, ensure_ascii=False),
                datetime.now(timezone.utc).isoformat(),
            ),
        )

    def latest_snapshot(self, snapshot_key: str) -> dict[str, Any] | None:
        conn = connect()
        row = conn.execute(
            """
            SELECT payload, created_at FROM analytics_snapshots
            WHERE snapshot_key=?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (snapshot_key,),
        ).fetchone()
        conn.close()
        if not row:
            return None
        return {"payload": json.loads(row["payload"]), "createdAt": row["created_at"]}

    def upsert_ml_feature(self, day: str, appointment_count: int, updated_at: str) -> None:
        conn = connect()
        exists = conn.execute("SELECT 1 FROM ml_features_daily WHERE day=?", (day,)).fetchone()
        conn.close()
        if exists:
            _write(
                "UPDATE ml_features_daily SET appointment_count=?, updated_at=? WHERE day=?",
                (appointment_count, updated_at, day),
            )
        else:
            _write(
                "INSERT INTO ml_features_daily (day, appointment_count, updated_at) VALUES (?,?,?)",
                (day, appointment_count, updated_at),
            )

    def ml_features_count(self) -> int:
        conn = connect()
        count = conn.execute("SELECT COUNT(*) AS c FROM ml_features_daily").fetchone()["c"]
        conn.close()
        return int(count)
