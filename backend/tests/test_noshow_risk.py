from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str = "admin@sihia.health", password: str = "admin123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_noshow_risk_list_shape() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/noshow-risk?horizonDays=14&minRisk=0&limit=20", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["model"] == "heuristic-noshow"
    assert body["model_version"].startswith("heuristic-noshow")
    assert body["engine"] == "rules"
    assert body["source"] in {"sqlite", "postgresql"}
    assert "generatedAt" in body
    assert "disclaimer" in body
    assert "summary" in body
    assert set(body["summary"]) >= {"high", "medium", "low", "avgRisk"}
    assert isinstance(body["items"], list)
    assert body["total"] >= len(body["items"])
    if body["items"]:
        item = body["items"][0]
        assert 0 <= item["riskScore"] <= 1
        assert item["riskLevel"] in {"high", "medium", "low"}
        assert "appointmentId" in item
        assert "patientId" in item
        assert "factors" in item
        assert item["suggestedAction"] in {"remind", "confirm_or_call"}
        # sorted by risk desc
        scores = [i["riskScore"] for i in body["items"]]
        assert scores == sorted(scores, reverse=True)


def test_noshow_risk_filters_and_pagination() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    high = client.get(
        "/api/ml/noshow-risk?horizonDays=30&minRisk=0.45&riskLevel=high&limit=5&offset=0",
        headers=headers,
    )
    assert high.status_code == 200
    body = high.json()
    assert all(i["riskLevel"] == "high" for i in body["items"])
    assert all(i["riskScore"] >= 0.45 for i in body["items"])
    assert body["limit"] == 5
    assert body["offset"] == 0


def test_noshow_risk_requires_ml_permission() -> None:
    headers = {"Authorization": f"Bearer {_token('staff@sihia.health', 'staff123')}"}
    res = client.get("/api/ml/noshow-risk", headers=headers)
    assert res.status_code == 403


def test_noshow_risk_rejects_bad_level() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/noshow-risk?riskLevel=extreme", headers=headers)
    assert res.status_code == 422
