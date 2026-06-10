"""DAG refresh snapshots analytics."""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

from sihia_paths import ensure_backend_on_path

ensure_backend_on_path()


def _run_analytics_refresh() -> None:
    from app.application.pipeline_service import PipelineService

    PipelineService().run("analytics_refresh")


with DAG(
    dag_id="analytics_refresh",
    description="Rafraichit les snapshots KPI / revenus / alertes",
    schedule=timedelta(hours=1),
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sihia", "analytics"],
) as dag:
    PythonOperator(
        task_id="refresh_analytics_snapshots",
        python_callable=_run_analytics_refresh,
    )
