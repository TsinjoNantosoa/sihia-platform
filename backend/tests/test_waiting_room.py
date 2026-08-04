from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_waiting_room_snapshot() -> None:
    res = client.get("/api/waiting-room", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert "waiting" in body
    assert "inProgress" in body
    assert "upcoming" in body
    assert "counts" in body
    assert "date" in body


def test_waiting_room_call_next_ok_or_empty() -> None:
    res = client.post("/api/waiting-room/call-next", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert "message" in body
    assert "called" in body
