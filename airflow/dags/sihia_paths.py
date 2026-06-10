"""Chemins backend SIH IA (repo local ou conteneur Docker)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def backend_dir() -> Path:
    env = os.getenv("SIHIA_BACKEND_DIR")
    if env:
        return Path(env)
    repo_backend = Path(__file__).resolve().parents[2] / "backend"
    docker_backend = Path("/opt/sihia/backend")
    if (docker_backend / "app").is_dir():
        return docker_backend
    return repo_backend


def ensure_backend_on_path() -> Path:
    path = backend_dir()
    root = str(path)
    if root not in sys.path:
        sys.path.insert(0, root)
    return path
