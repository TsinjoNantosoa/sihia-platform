"""Verification manuelle etapes 1-3 pipeline + health."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.infrastructure.database import connect
from app.main import app

client = TestClient(app)


def main() -> None:
    login = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    print("=== STEP 1: CSV -> patients DB ===")
    conn = connect()
    rows = conn.execute(
        "SELECT record_number, first_name, last_name FROM patients WHERE record_number LIKE 'IMP-%' ORDER BY record_number"
    ).fetchall()
    conn.close()
    for row in rows:
        print(f"  {row['record_number']}: {row['first_name']} {row['last_name']}")
    assert len(rows) >= 2, "Attendu >= 2 patients IMP-*"

    print("=== STEP 3: GET /api/admin/pipeline/status ===")
    res = client.get("/api/admin/pipeline/status", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    for dag in body["dags"]:
        last = dag.get("lastRun") or {}
        print(f"  {dag['dagId']}: {last.get('status', 'never')}")
    pi = next(d for d in body["dags"] if d["dagId"] == "patient_import")
    assert pi.get("lastRun", {}).get("status") == "success"

    health = client.get("/health/details")
    pipeline = health.json()["components"]["pipeline"]
    print("=== health pipeline ===", pipeline)
    assert pipeline.get("status") == "ok"

    print("OK - etapes 1 et 3 validees")


if __name__ == "__main__":
    main()
