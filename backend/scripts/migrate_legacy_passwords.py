#!/usr/bin/env python3
"""Migration one-shot des mots de passe legacy (plaintext → PBKDF2).

Usage:
    python scripts/migrate_legacy_passwords.py

Ne pas exécuter automatiquement au démarrage FastAPI.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.infrastructure.database import run_migrations  # noqa: E402
from app.infrastructure.seed import migrate_legacy_password_hashes  # noqa: E402


def main() -> None:
    run_migrations()
    migrated = migrate_legacy_password_hashes()
    print(f"Legacy password migration complete. {migrated} account(s) updated.")


if __name__ == "__main__":
    main()
