from __future__ import annotations

from fastapi import Header, HTTPException, Request, status


def require_chatbot_token(
    request: Request,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="x-api-key"),
) -> None:
    expected = getattr(request.app.state, "chatbot_api_token", "") or ""
    if not expected:
        return

    token = ""
    if x_api_key:
        token = x_api_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token chatbot invalide",
        )
