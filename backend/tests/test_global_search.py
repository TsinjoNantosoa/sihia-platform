from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_search_requires_min_query() -> None:
    res = client.get("/api/search?q=a", headers=_headers())
    assert res.status_code == 200
    assert res.json()["items"] == []


def test_search_returns_typed_items() -> None:
    res = client.get("/api/search?q=ben", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    for item in body["items"]:
        assert item["type"] in {"patient", "doctor", "appointment"}
        assert item["href"].startswith("/")
        assert "title" in item
