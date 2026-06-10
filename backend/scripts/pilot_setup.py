"""
Prépare l'environnement pilote PostgreSQL (migrations + copie SQLite optionnelle).

Usage (depuis la racine du repo) :
  npm run pilot:setup

Prérequis :
  docker compose up -d postgres
  backend/.env avec DATABASE_URL PostgreSQL (voir .env.example)
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.application.health_service import build_health_details
from app.infrastructure.database import get_engine, is_postgresql, reset_engine, run_migrations, sqlalchemy_url


def _migrate_sqlite_if_present() -> None:
    sqlite_path = Path(__file__).resolve().parents[1] / "app.db"
    if not sqlite_path.exists():
        print(f"  SQLite absent ({sqlite_path.name}) — migration données ignorée")
        return
    import importlib.util

    migrate_path = Path(__file__).resolve().parent / "migrate_sqlite_to_postgres.py"
    spec = importlib.util.spec_from_file_location("migrate_sqlite_to_postgres", migrate_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Impossible de charger {migrate_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.main()


def main() -> None:
    reset_engine()
    if not is_postgresql():
        print(f"DATABASE_URL doit pointer vers PostgreSQL, reçu : {sqlalchemy_url()}", file=sys.stderr)
        print("Copiez backend/.env.example vers backend/.env et ajustez le port (5434 ou 5435).", file=sys.stderr)
        sys.exit(1)

    print(f"Cible : {sqlalchemy_url()}")
    print("Migrations Alembic…")
    run_migrations()

    print("Copie SQLite -> PostgreSQL...")
    _migrate_sqlite_if_present()

    db = build_health_details()["components"]["database"]
    if db.get("status") != "ok" or db.get("type") != "postgresql":
        print(f"Échec health DB : {db}", file=sys.stderr)
        sys.exit(1)

    with get_engine().connect() as conn:
        users = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()

    print(f"OK — PostgreSQL ({db.get('latency_ms')} ms), {users} utilisateur(s)")


if __name__ == "__main__":
    main()
