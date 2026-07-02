import logging
import time
import uuid

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.application.health_service import build_health_details
from app.core.config import settings
from app.core.logging_config import configure_logging, log_event
from app.core.metrics import metrics
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter
from app.presentation.chatbot_routes import build_chatbot_router
from app.presentation.deps import chatbot_service, chatbot_rate_limiter
from app.presentation.routes import api_router

configure_logging()
logger = logging.getLogger("sihia")
security_logger = logging.getLogger("sihia.security")

app = FastAPI(title=settings.app_name, version="0.1.0")
app.state.chatbot_api_token = settings.chatbot_api_token

_static_dir = Path(__file__).resolve().parents[1] / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

_chatbot_limiter = chatbot_rate_limiter
app.include_router(build_chatbot_router(chatbot_service, chatbot_rate_limiter))

if settings.is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://[\w.\-]+(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
    metrics.inc("http_requests")
    if response.status_code >= 500:
        metrics.inc("http_errors_5xx")
    log_event(
        logger,
        logging.INFO,
        "http_request",
        method=request.method,
        path=request.url.path,
        statusCode=response.status_code,
        durationMs=elapsed_ms,
        correlationId=correlation_id,
    )
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(api_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    correlation_id = getattr(request.state, "correlation_id", None)
    if exc.status_code == status.HTTP_403_FORBIDDEN:
        metrics.inc("auth_forbidden")
        log_event(
            security_logger,
            logging.WARNING,
            "auth_forbidden",
            path=str(request.url.path),
            method=request.method,
            correlationId=correlation_id,
        )
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        metrics.inc("auth_unauthorized")
        log_event(
            security_logger,
            logging.INFO,
            "auth_unauthorized",
            path=str(request.url.path),
            method=request.method,
            correlationId=correlation_id,
        )

    detail = exc.detail
    if isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", "Request failed")
        details = detail.get("details")
    else:
        default_codes = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
        }
        code = default_codes.get(exc.status_code, "HTTP_ERROR")
        message = str(detail)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "message": message,
            "details": details,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Payload invalide",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, _exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Erreur interne du serveur",
            "details": None,
        },
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/details")
def health_details():
    body = build_health_details()
    body["metrics"] = metrics.snapshot()
    return body
