#!/usr/bin/env python3
"""Seed explicite des données de démonstration SIHIA.

Usage:
    python scripts/seed_demo.py

Ne pas appeler automatiquement au démarrage FastAPI en production.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.infrastructure.database import run_migrations  # noqa: E402
from app.infrastructure.seed import seed_demo_data  # noqa: E402


def main() -> None:
    run_migrations()
    seed_demo_data()
    print("Demo data seeded successfully.")


if __name__ == "__main__":
    main()
