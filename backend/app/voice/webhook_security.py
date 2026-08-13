"""Validation webhooks Twilio / ElevenLabs — corps brut, URL publique, rate-limit."""

from __future__ import annotations

import hmac
from typing import Any

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter

voice_webhook_limiter = ChatbotRateLimiter(max_per_minute=120)
voice_tool_gateway_limiter = ChatbotRateLimiter(max_per_minute=60)


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
    """Vérification officielle ElevenLabs SDK — raw body exact, pas de re-sérialisation JSON."""
    if not signature_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing ElevenLabs signature")
    try:
        from elevenlabs.client import ElevenLabs
        from elevenlabs.errors import BadRequestError
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="elevenlabs package missing") from exc

    raw_text = raw_body.decode("utf-8")
    client = ElevenLabs(api_key=settings.elevenlabs_api_key or "unused")
    try:
        client.webhooks.construct_event(
            rawBody=raw_text,
            sig_header=signature_header,
            secret=secret,
        )
    except TypeError:
        try:
            client.webhooks.construct_event(
                payload=raw_text,
                sig_header=signature_header,
                secret=secret,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid ElevenLabs signature",
            ) from exc
    except BadRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ElevenLabs signature",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ElevenLabs signature",
        ) from exc


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
    """Secret service-to-service uniquement — jamais un JWT administrateur SIHIA."""
    secret = (settings.elevenlabs_tool_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VOICE_PROVIDER_NOT_CONFIGURED", "message": "Voice tool gateway is not configured"},
        )
    provided = (request.headers.get("X-SIHIA-Tool-Secret") or "").strip()
    if not provided or not hmac.compare_digest(provided, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tool gateway secret")
