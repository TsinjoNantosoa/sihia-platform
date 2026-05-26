"""Couche d'accès SQL unifiée (SQLite ou PostgreSQL via SQLAlchemy)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Sequence

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, Result

from app.core.config import settings

_engine: Engine | None = None


def sqlalchemy_url() -> str:
    raw = settings.database_url.strip()
    if raw.startswith(("sqlite://", "postgresql://", "postgres://", "postgresql+")):
        return raw
    db_path = Path(raw)
    if not db_path.is_absolute():
        db_path = Path(__file__).resolve().parents[2] / db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.as_posix()}"


def is_postgresql() -> bool:
    url = sqlalchemy_url()
    return url.startswith("postgresql") or url.startswith("postgres://")


def reset_engine() -> None:
    """Réinitialise le pool SQLAlchemy (tests avec DATABASE_URL temporaire)."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = sqlalchemy_url()
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    return _engine


def _to_named_params(sql: str, params: Sequence[Any] | Mapping[str, Any] | None) -> tuple[str, dict[str, Any]]:
    if params is None:
        return sql, {}
    if isinstance(params, Mapping):
        return sql, dict(params)
    parts = sql.split("?")
    if len(parts) == 1:
        return sql, {}
    if len(parts) - 1 != len(params):
        raise ValueError("Nombre de paramètres SQL incompatible")
    named: dict[str, Any] = {}
    rebuilt = parts[0]
    for index, value in enumerate(params):
        key = f"p{index}"
        named[key] = value
        rebuilt += f":{key}" + parts[index + 1]
    return rebuilt, named


def _adapt_sql(sql: str) -> str:
    return sql.replace("ORDER BY rowid DESC", "ORDER BY id DESC")


class ExecuteResult:
    def __init__(self, result: Result[Any]) -> None:
        self._result = result

    def fetchone(self) -> dict[str, Any] | None:
        row = self._result.mappings().first()
        return dict(row) if row else None

    def fetchall(self) -> list[dict[str, Any]]:
        return [dict(row) for row in self._result.mappings().all()]


class DBConnection:
    def __init__(self, conn) -> None:
        self._conn = conn

    def execute(self, sql: str, params: Sequence[Any] | Mapping[str, Any] | None = None) -> ExecuteResult:
        if "INSERT OR REPLACE INTO refresh_sessions" in sql:
            return ExecuteResult(self._upsert_refresh_session(params))
        prepared = _adapt_sql(sql)
        named_sql, named_params = _to_named_params(prepared, params)
        return ExecuteResult(self._conn.execute(text(named_sql), named_params))

    def _upsert_refresh_session(self, params: Sequence[Any] | Mapping[str, Any] | None) -> Result[Any]:
        _, named = _to_named_params(
            "INSERT OR REPLACE INTO refresh_sessions (session_id,user_id,expires_at_ts,revoked) VALUES (?,?,?,0)",
            params,
        )
        if is_postgresql():
            return self._conn.execute(
                text(
                    """
                    INSERT INTO refresh_sessions (session_id, user_id, expires_at_ts, revoked)
                    VALUES (:p0, :p1, :p2, 0)
                    ON CONFLICT (session_id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        expires_at_ts = EXCLUDED.expires_at_ts,
                        revoked = 0
                    """
                ),
                named,
            )
        return self._conn.execute(
            text(
                "INSERT OR REPLACE INTO refresh_sessions (session_id,user_id,expires_at_ts,revoked) VALUES (:p0,:p1,:p2,0)"
            ),
            named,
        )

    def executemany(self, sql: str, rows: Sequence[Sequence[Any]]) -> None:
        prepared = _adapt_sql(sql)
        named_sql, _ = _to_named_params(prepared, rows[0] if rows else ())
        for row in rows:
            _, named_params = _to_named_params(prepared, row)
            self._conn.execute(text(named_sql), named_params)

    def commit(self) -> None:
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()


def connect() -> DBConnection:
    return DBConnection(get_engine().connect())


def run_migrations() -> None:
    from alembic import command
    from alembic.config import Config

    alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    cfg = Config(str(alembic_ini))
    cfg.set_main_option("sqlalchemy.url", sqlalchemy_url())
    command.upgrade(cfg, "head")


def bootstrap_database() -> None:
    from sqlalchemy import inspect

    engine = get_engine()
    inspector = inspect(engine)
    has_users = inspector.has_table("users")
    has_alembic = inspector.has_table("alembic_version")

    if has_users and not has_alembic:
        from alembic import command
        from alembic.config import Config

        alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
        cfg = Config(str(alembic_ini))
        cfg.set_main_option("sqlalchemy.url", sqlalchemy_url())
        command.stamp(cfg, "head")
    else:
        run_migrations()

    from app.infrastructure.seed import seed_demo_data

    seed_demo_data()
