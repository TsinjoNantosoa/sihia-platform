"""Force SQLite + seed démo pour les tests (avant import de l'application)."""

import os

import pytest

os.environ["DATABASE_URL"] = "app.db"
os.environ["SEED_DEMO_DATA"] = "true"


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    from app.presentation.rate_limit import reset_login_limiter_all, reset_password_reset_limiter_all

    reset_login_limiter_all()
    reset_password_reset_limiter_all()
    yield
    reset_login_limiter_all()
    reset_password_reset_limiter_all()
