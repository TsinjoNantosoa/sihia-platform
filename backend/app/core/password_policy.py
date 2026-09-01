"""Politique de mot de passe centralisée."""

from __future__ import annotations

MIN_PASSWORD_LENGTH = 10
MAX_PASSWORD_LENGTH = 128


def validate_password(password: str) -> str:
    """Valide un mot de passe ; lève ValueError si invalide."""
    if not isinstance(password, str):
        raise ValueError("Mot de passe invalide")
    length = len(password)
    if length < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Le mot de passe doit contenir au moins {MIN_PASSWORD_LENGTH} caractères")
    if length > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Le mot de passe ne doit pas dépasser {MAX_PASSWORD_LENGTH} caractères")
    return password
