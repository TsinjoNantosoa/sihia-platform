import ast
from pathlib import Path

from fastapi.testclient import TestClient

from app.application.pipeline_service import PipelineService
from app.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_analytics_refresh_writes_snapshots() -> None:
    service = PipelineService()
    result = service.run("analytics_refresh")
    assert result["status"] == "success"
    assert result["metrics"]["snapshotsWritten"] >= 5
    snap = service.repo.latest_snapshot("kpis")
    assert snap is not None
    assert "payload" in snap
    assert "patientsToday" in snap["payload"]


def test_ml_features_builds_daily_rows() -> None:
    service = PipelineService()
    before = service.repo.ml_features_count()
    result = service.run("ml_features")
    assert result["status"] == "success"
    assert result["metrics"]["daysWritten"] >= 0
    assert service.repo.ml_features_count() >= before


def test_patient_import_from_sample_csv() -> None:
    service = PipelineService()
    result = service.run("patient_import")
    assert result["status"] == "success"
    metrics = result["metrics"]
    assert metrics["filesProcessed"] >= 1
    assert metrics["rowsLoaded"] >= 2
    assert metrics["errorRate"] == 0.0


def test_sihia_daily_runs_all_steps() -> None:
    service = PipelineService()
    result = service.run("sihia_daily")
    assert result["dagId"] == "sihia_daily"
    assert len(result["steps"]) == 3
    assert all(step["status"] == "success" for step in result["steps"])


def test_pipeline_status_api() -> None:
    headers = _admin_headers()
    client.post("/api/admin/pipeline/run/analytics_refresh", headers=headers)
    res = client.get("/api/admin/pipeline/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "dags" in body
    assert any(d["dagId"] == "analytics_refresh" for d in body["dags"])


def test_health_details_includes_pipeline() -> None:
    res = client.get("/health/details")
    assert res.status_code == 200
    assert "pipeline" in res.json()["components"]


def test_dag_files_are_valid_python() -> None:
    dag_dir = REPO_ROOT / "airflow" / "dags"
    files = list(dag_dir.glob("dag_*.py"))
    assert len(files) >= 4
    for path in files:
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
