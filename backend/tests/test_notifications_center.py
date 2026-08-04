from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_notifications_inbox_shape() -> None:
    headers = _headers()
    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert "unreadCount" in body
    assert "prefs" in body
    assert isinstance(body["items"], list)
    if body["items"]:
        assert "read" in body["items"][0]
        assert "id" in body["items"][0]


def test_notifications_mark_read_and_prefs() -> None:
    headers = _headers()
    inbox = client.get("/api/notifications", headers=headers).json()
    alert_id = inbox["items"][0]["id"] if inbox["items"] else "al-ok"

    mark = client.post("/api/notifications/read", headers=headers, json={"alertIds": [alert_id]})
    assert mark.status_code == 200
    assert mark.json()["marked"] >= 0

    unread = client.get("/api/notifications?unreadOnly=true", headers=headers).json()
    assert all(not i["read"] for i in unread["items"])

    prefs = client.get("/api/notifications/prefs", headers=headers)
    assert prefs.status_code == 200
    assert "alertsEnabled" in prefs.json()

    updated = client.patch(
        "/api/notifications/prefs",
        headers=headers,
        json={"weeklyDigestEnabled": True, "alertsEnabled": True},
    )
    assert updated.status_code == 200
    assert updated.json()["weeklyDigestEnabled"] is True

    all_read = client.post("/api/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
