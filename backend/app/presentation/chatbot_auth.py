from __future__ import annotations

from fastapi import Header, HTTPException, Request, status

from app.core.security import decode_access_token


def require_chatbot_token(
    request: Request,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="x-api-key"),
) -> None:
    """Autorise le token serveur `CHATBOT_API_TOKEN` **ou** un JWT utilisateur SIH IA.

    Le secret chatbot ne doit jamais être exposé via une variable `VITE_*`.
    L'app web envoie le JWT de session ; les embeds peuvent injecter le token
    serveur via `window.__CHATBOT_API_TOKEN__` (page servie côté serveur uniquement).
    """
    expected = getattr(request.app.state, "chatbot_api_token", "") or ""

    api_key = (x_api_key or "").strip()
    bearer = ""
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()

    if expected and api_key and api_key == expected:
        return
    if expected and bearer and bearer == expected:
        return

    # JWT utilisateur plateforme (access token)
    candidate = bearer or api_key
    if candidate:
        try:
            decode_access_token(candidate)
            return
        except Exception:
            pass

    if not expected:
        # Auth chatbot désactivée (dev) si aucun secret configuré
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token chatbot invalide",
    )
