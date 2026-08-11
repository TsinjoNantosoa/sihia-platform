from pathlib import Path

import pytest
from fastapi import HTTPException

from app.application.use_cases import AuthService, ROLE_PERMISSIONS
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


def test_demo_roles_receive_the_canonical_permission_matrix(tmp_path: Path) -> None:
    auth = _setup_test_db(tmp_path)
    accounts = {
        "admin": ("admin@sihia.health", "admin123"),
        "doctor": ("dr.benali@sihia.health", "demo1234"),
        "manager": ("manager@sihia.health", "manager123"),
        "staff": ("staff@sihia.health", "staff123"),
    }

    for role, (email, password) in accounts.items():
        access_token, _refresh = auth.login(email, password)
        claims = decode_access_token(access_token)
        assert claims["role"] == role
        assert claims["permissions"] == ROLE_PERMISSIONS[role]


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
        with pytest.raises(HTTPException) as error:
            auth.refresh(old)
        assert error.value.status_code == 401
    # latest should still work
    for recent in refresh_tokens[-3:]:
        _access, _refresh = auth.refresh(recent)
