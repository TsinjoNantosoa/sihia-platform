from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from app.application.chatbot_service import ChatbotService
from app.infrastructure.chatbot_session_store import ChatbotSessionStore
from app.presentation.chatbot_auth import require_chatbot_token
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter

chatbot_router = APIRouter(tags=["chatbot"])


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    lang: str = "fr"
    user_id: str | None = None
    session_id: str | None = None


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    lang: str = "fr"


def _rate_limit_key(request: Request) -> str:
    client = request.client.host if request.client else "unknown"
    tenant = request.headers.get("X-Client-ID", "sihia")
    return f"{tenant}:{client}"


def build_chatbot_router(
    chatbot_service: ChatbotService,
    rate_limiter: ChatbotRateLimiter,
) -> APIRouter:
    router = APIRouter(tags=["chatbot"])

    @router.get("/ui-config")
    def ui_config(
        client_id: str = Query(default="sihia"),
        _: None = Depends(require_chatbot_token),
    ):
        return JSONResponse(content=chatbot_service.get_ui_config(client_id))

    @router.get("/history")
    def history(
        request: Request,
        session_id: str = Query(default=""),
        user_id: str = Query(default=""),
        _: None = Depends(require_chatbot_token),
    ):
        sid = (session_id or user_id or "").strip()
        if not sid:
            raise HTTPException(status_code=400, detail="session_id requis")
        messages = chatbot_service.get_history(sid)
        return {
            "session_id": sid,
            "tenant_slug": request.headers.get("X-Client-ID", "sihia"),
            "messages": messages,
        }

    @router.post("/query-stream")
    async def query_stream(
        request: Request,
        body: QueryRequest,
        _: None = Depends(require_chatbot_token),
    ):
        retry = rate_limiter.check(_rate_limit_key(request))
        if retry is not None:
            msg = (
                "<p>Trop de requêtes. Veuillez patienter une minute.</p>"
                if (body.lang or "fr").startswith("fr")
                else "<p>Too many requests. Please wait a minute.</p>"
            )
            return StreamingResponse(
                iter([f"data: {json.dumps({'token': msg, 'replace': True})}\n\n", "data: [DONE]\n\n"]),
                media_type="text/event-stream",
            )

        session_id = (body.session_id or body.user_id or "").strip()
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id requis")

        async def event_stream():
            async for chunk in chatbot_service.stream_reply(session_id, body.query.strip(), body.lang):
                yield chunk

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    @router.post("/transcribe")
    async def transcribe(
        request: Request,
        file: UploadFile = File(...),
        lang: str = Form(default="fr"),
        _: None = Depends(require_chatbot_token),
    ):
        retry = rate_limiter.check(_rate_limit_key(request))
        if retry is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de requêtes. Veuillez patienter.",
            )

        content = await file.read()
        try:
            text = chatbot_service.transcribe_audio(
                content,
                file.filename or "voice.webm",
                lang,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Échec de la transcription vocale",
            ) from exc

        return {"text": text, "lang": lang}

    @router.post("/speak")
    def speak(
        request: Request,
        body: SpeakRequest,
        _: None = Depends(require_chatbot_token),
    ):
        retry = rate_limiter.check(_rate_limit_key(request))
        if retry is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de requêtes. Veuillez patienter.",
            )
        try:
            audio = chatbot_service.synthesize_speech(body.text, body.lang)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Échec de la synthèse vocale",
            ) from exc
        return Response(content=audio, media_type="audio/mpeg")

    return router
