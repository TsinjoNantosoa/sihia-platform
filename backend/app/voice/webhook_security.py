"""Validation webhooks Twilio / ElevenLabs — corps brut, URL publique, rate-limit."""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter

voice_webhook_limiter = ChatbotRateLimiter(max_per_minute=120)
voice_tool_gateway_limiter = ChatbotRateLimiter(max_per_minute=60)

ELEVENLABS_SIGNATURE_TOLERANCE_S = 30 * 60


def enforce_rate_limit(key: str, limiter: ChatbotRateLimiter = voice_webhook_limiter) -> None:
    retry = limiter.check(key)
    if retry is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "RATE_LIMITED", "message": "Too many Voice webhook requests", "retryable": True},
        )


def client_key(request: Request, suffix: str) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{suffix}:{ip}"


def twilio_validation_url(request: Request) -> str:
    """URL publique utilisée par Twilio (Render / reverse proxy), jamais localhost interne."""
    path = request.url.path
    query = f"?{request.url.query}" if request.url.query else ""
    base = (settings.voice_public_base_url or "").strip().rstrip("/")
    if base:
        return f"{base}{path}{query}"
    if settings.voice_trust_proxy:
        proto = (request.headers.get("x-forwarded-proto") or request.url.scheme).split(",")[0].strip()
        host = (
            request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or request.url.netloc
        )
        host = host.split(",")[0].strip()
        return f"{proto}://{host}{path}{query}"
    return str(request.url)


def verify_elevenlabs_signature(raw_body: bytes, signature_header: str | None, secret: str) -> None:
    """Schéma officiel ElevenLabs (t=,v0=) + timestamp — corps brut, pas de re-sérialisation JSON."""
    if not signature_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing ElevenLabs signature")
    try:
        from elevenlabs.webhooks import construct_event  # type: ignore[import-not-found]
    except ImportError:
        construct_event = None
    if construct_event is not None:
        try:
            construct_event(payload=raw_body.decode("utf-8"), sig_header=signature_header, secret=secret)
            return
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ElevenLabs signature") from exc

    parts: dict[str, str] = {}
    for item in signature_header.split(","):
        if "=" not in item:
            continue
        key, value = item.strip().split("=", 1)
        parts[key.strip()] = value.strip()
    timestamp = parts.get("t")
    provided = parts.get("v0") or parts.get("v1")
    if not timestamp or not provided:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ElevenLabs signature")
    try:
        ts_int = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ElevenLabs signature") from exc
    if abs(time.time() - ts_int) > ELEVENLABS_SIGNATURE_TOLERANCE_S:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired ElevenLabs signature")
    signed = f"{timestamp}.".encode("utf-8") + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ElevenLabs signature")


def validate_twilio_signature(form: dict[str, Any], request: Request) -> None:
    signature = request.headers.get("X-Twilio-Signature", "")
    if not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Twilio signature")
    try:
        from twilio.request_validator import RequestValidator
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="twilio package missing") from exc
    validator = RequestValidator(settings.twilio_auth_token)
    params = {str(key): str(value) for key, value in form.items()}
    url = twilio_validation_url(request)
    if not validator.validate(url, params, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Twilio signature")


def require_tool_gateway_secret(request: Request) -> None:
    secret = (settings.elevenlabs_tool_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VOICE_PROVIDER_NOT_CONFIGURED", "message": "Voice tool gateway is not configured"},
        )
    provided = request.headers.get("X-SIHIA-Tool-Secret") or request.headers.get("X-ElevenLabs-Tool-Secret") or ""
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        provided = provided or auth[7:].strip()
    if not provided or not hmac.compare_digest(provided, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tool gateway secret")
