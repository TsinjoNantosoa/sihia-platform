from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_export_excel_returns_spreadsheet() -> None:
    res = client.get("/api/analytics/export/excel?period=6m", headers=_admin_headers())
    assert res.status_code == 200
    assert "spreadsheetml" in res.headers.get("content-type", "")
    assert len(res.content) > 1000


def test_export_pdf_returns_pdf() -> None:
    res = client.get("/api/analytics/export/pdf?period=6m", headers=_admin_headers())
    assert res.status_code == 200
    assert res.headers.get("content-type") == "application/pdf"
    assert res.content.startswith(b"%PDF")
