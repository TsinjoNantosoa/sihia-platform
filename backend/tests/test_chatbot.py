import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter
from app.presentation.deps import chatbot_sessions, chatbot_service


@pytest.fixture(autouse=True)
def reset_chatbot_state():
    chatbot_sessions.clear_all()
    yield
    chatbot_sessions.clear_all()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "chatbot_api_token", "test-chatbot-token")
    monkeypatch.setattr(settings, "openai_api_key", "")
    app.state.chatbot_api_token = "test-chatbot-token"
    return TestClient(app)


def auth_headers():
    return {
        "Authorization": "Bearer test-chatbot-token",
        "X-Client-ID": "sihia",
        "X-Tenant-ID": "1",
    }


def test_ui_config(client):
    r = client.get("/ui-config?client_id=sihia", headers=auth_headers())
    assert r.status_code == 200
    data = r.json()
    assert data["bot_name"] == "SIH IA Assistant"
    assert "welcome_fr" in data


def test_ui_config_requires_token(client):
    r = client.get("/ui-config?client_id=sihia")
    assert r.status_code == 401


def test_history_empty(client):
    r = client.get("/history?session_id=session-test-1", headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["messages"] == []


def test_query_stream_guardrail_emergency(client):
    r = client.post(
        "/query-stream",
        headers=auth_headers(),
        json={
            "query": "j'ai une urgence cardiaque",
            "lang": "fr",
            "session_id": "session-emergency",
        },
    )
    assert r.status_code == 200
    body = r.text
    assert "15" in body or "112" in body
    assert "[DONE]" in body
    history = client.get("/history?session_id=session-emergency", headers=auth_headers()).json()
    assert len(history["messages"]) == 2


def test_query_stream_kb_fallback(client):
    r = client.post(
        "/query-stream",
        headers=auth_headers(),
        json={
            "query": "comment prendre un rendez-vous",
            "lang": "fr",
            "session_id": "session-rdv",
        },
    )
    assert r.status_code == 200
    assert "Rendez-vous" in r.text or "rendez-vous" in r.text.lower()
    history = client.get("/history?session_id=session-rdv", headers=auth_headers()).json()
    assert any(m["role"] == "bot" for m in history["messages"])


def test_query_stream_diagnosis_blocked(client):
    r = client.post(
        "/query-stream",
        headers=auth_headers(),
        json={
            "query": "quel diagnostic pour ma fièvre et mes symptômes",
            "lang": "fr",
            "session_id": "session-dx",
        },
    )
    assert r.status_code == 200
    assert "diagnostic" in r.text.lower()


def test_rate_limit_returns_message(client, monkeypatch):
    from app.presentation import deps

    deps.chatbot_rate_limiter.max_per_minute = 1
    deps.chatbot_rate_limiter.reset()
    headers = auth_headers()
    payload = {"query": "bonjour", "lang": "fr", "session_id": "session-rl"}
    assert client.post("/query-stream", headers=headers, json=payload).status_code == 200
    r2 = client.post("/query-stream", headers=headers, json=payload)
    assert r2.status_code == 200
    assert "requête" in r2.text.lower() or "request" in r2.text.lower() or "trop" in r2.text.lower()
    deps.chatbot_rate_limiter.max_per_minute = 20
    deps.chatbot_rate_limiter.reset()


@patch("app.application.chatbot_service.ChatbotService._stream_openai_tokens")
def test_query_stream_openai_mock(mock_stream, client, monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    mock_stream.return_value = iter(["<p>Réponse ", "test</p>"])
    r = client.post(
        "/query-stream",
        headers=auth_headers(),
        json={
            "query": "horaires accueil",
            "lang": "fr",
            "session_id": "session-llm",
        },
    )
    assert r.status_code == 200
    assert "Réponse" in r.text or "test" in r.text
