from pathlib import Path

from app.application.use_cases import AuthService
from app.core.config import settings
from app.core.security import decode_access_token, hash_password, verify_password
from app.infrastructure.database import bootstrap_database, reset_engine
from app.infrastructure.sqlite_repositories import (
    SQLiteRefreshSessionRepository,
    SQLiteUserRepository,
)


def _setup_test_db(tmp_path: Path) -> AuthService:
    settings.database_url = str(tmp_path / "test_auth.db")
    reset_engine()
    bootstrap_database()
    users = SQLiteUserRepository()
    sessions = SQLiteRefreshSessionRepository()
    return AuthService(users, sessions)


def test_password_hash_and_verify() -> None:
    hashed = hash_password("secret123")
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_refresh_rotation_invalidates_old_token(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    _access1, refresh1 = auth.login("admin@sihia.health", "admin123")
    _access2, refresh2 = auth.refresh(refresh1)
    # old refresh token should not be reusable
    try:
        auth.refresh(refresh1)
        assert False, "Old refresh token should be invalidated after rotation"
    except Exception:
        pass
    # latest refresh still works
    _access3, _refresh3 = auth.refresh(refresh2)


def test_access_token_includes_permissions_claim(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    access_token, _refresh = auth.login("admin@sihia.health", "admin123")
    claims = decode_access_token(access_token)
    assert "permissions" in claims
    assert isinstance(claims["permissions"], list)
    assert "patients:read" in claims["permissions"]


def test_refresh_access_token_includes_permissions_claim(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    _access, refresh = auth.login("admin@sihia.health", "admin123")
    new_access, _new_refresh = auth.refresh(refresh)
    claims = decode_access_token(new_access)
    assert "permissions" in claims
    assert isinstance(claims["permissions"], list)
    assert "patients:read" in claims["permissions"]


def test_logout_revokes_session(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    _access, refresh = auth.login("admin@sihia.health", "admin123")
    auth.logout(refresh)
    try:
        auth.refresh(refresh)
        assert False, "Refresh after logout must fail"
    except Exception:
        pass


def test_max_refresh_sessions_limit(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    settings.max_refresh_sessions_per_user = 3
    refresh_tokens: list[str] = []
    for _ in range(5):
        _access, refresh = auth.login("admin@sihia.health", "admin123")
        refresh_tokens.append(refresh)
    # oldest should be pruned
    for old in refresh_tokens[:2]:
        try:
            auth.refresh(old)
            assert False, "Old sessions should be pruned"
        except Exception:
            pass
    # latest should still work
    _access, _refresh = auth.refresh(refresh_tokens[-1])
