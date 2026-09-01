"""Tests migration mots de passe legacy."""

from __future__ import annotations

from app.core.security import hash_password, verify_password
from app.infrastructure.database import connect
from app.infrastructure.seed import is_legacy_plaintext_password, migrate_legacy_password_hashes


def test_is_legacy_plaintext_password_detects_formats() -> None:
    assert not is_legacy_plaintext_password(hash_password("secret"))
    assert not is_legacy_plaintext_password("$2b$12$abcdefghijklmnopqrstuv")
    assert not is_legacy_plaintext_password("$argon2id$v=19$m=65536")
    assert is_legacy_plaintext_password("admin123")


def test_migrate_legacy_password_hashes_one_shot() -> None:
    conn = connect()
    conn.execute(
        "INSERT OR REPLACE INTO users (id,name,email,password,role,facility,status) VALUES (?,?,?,?,?,?,?)",
        ("u-legacy-test", "Legacy", "legacy.pwd@sihia.health", "plainpass12", "staff", "Test", "active"),
    )
    conn.commit()
    conn.close()

    migrated = migrate_legacy_password_hashes()
    assert migrated >= 1

    conn = connect()
    row = conn.execute("SELECT password FROM users WHERE id=?", ("u-legacy-test",)).fetchone()
    conn.close()
    assert row is not None
    assert str(row["password"]).startswith("pbkdf2_sha256$")
    assert verify_password("plainpass12", row["password"])

    conn = connect()
    conn.execute("DELETE FROM users WHERE id=?", ("u-legacy-test",))
    conn.commit()
    conn.close()
