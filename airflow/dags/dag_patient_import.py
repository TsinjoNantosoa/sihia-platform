"""DAG import patients depuis CSV (data/imports/*.csv)."""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

from sihia_paths import ensure_backend_on_path

ensure_backend_on_path()


def _run_patient_import() -> None:
    from app.application.pipeline_service import PipelineService

    PipelineService().run("patient_import")


with DAG(
    dag_id="patient_import",
    description="Import et validation patients CSV",
    schedule=timedelta(hours=6),
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sihia", "import"],
) as dag:
    PythonOperator(
        task_id="import_patients_csv",
        python_callable=_run_patient_import,
    )
