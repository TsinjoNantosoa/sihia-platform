"""DAG orchestrateur quotidien SIH IA."""

from __future__ import annotations

from datetime import datetime

from airflow import DAG
from airflow.operators.python import PythonOperator

from sihia_paths import ensure_backend_on_path

ensure_backend_on_path()


def _run_daily() -> None:
    from app.application.pipeline_service import PipelineService

    PipelineService().run("sihia_daily")


with DAG(
    dag_id="sihia_daily",
    description="Chaine import -> analytics -> ML features",
    schedule="0 5 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sihia", "orchestrator"],
) as dag:
    PythonOperator(
        task_id="run_daily_pipeline",
        python_callable=_run_daily,
    )
