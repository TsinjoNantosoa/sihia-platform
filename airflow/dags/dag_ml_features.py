"""DAG features ML (comptages RDV journaliers)."""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

from sihia_paths import ensure_backend_on_path

ensure_backend_on_path()


def _run_ml_features() -> None:
    from app.application.pipeline_service import PipelineService

    PipelineService().run("ml_features")


with DAG(
    dag_id="ml_features",
    description="Construit ml_features_daily pour la prediction",
    schedule=timedelta(hours=12),
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sihia", "ml"],
) as dag:
    PythonOperator(
        task_id="build_ml_features",
        python_callable=_run_ml_features,
    )
