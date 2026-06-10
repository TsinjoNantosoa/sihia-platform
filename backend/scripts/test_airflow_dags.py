"""Verifie que les callables des DAG Airflow s executent comme en production."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DAG_DIR = REPO / "airflow" / "dags"
sys.path.insert(0, str(DAG_DIR))
sys.path.insert(0, str(REPO / "backend"))


def _install_airflow_stubs() -> None:
    """Permet de charger les fichiers DAG sans installer apache-airflow localement."""
    import types
    from datetime import timedelta

    class _DAG:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class _PythonOperator:
        def __init__(self, *args, **kwargs):
            self.python_callable = kwargs.get("python_callable")

    airflow = types.ModuleType("airflow")
    airflow.DAG = _DAG
    operators = types.ModuleType("airflow.operators")
    python_mod = types.ModuleType("airflow.operators.python")
    python_mod.PythonOperator = _PythonOperator
    operators.python = python_mod
    airflow.operators = operators
    sys.modules["airflow"] = airflow
    sys.modules["airflow.operators"] = operators
    sys.modules["airflow.operators.python"] = python_mod
    # Evite NameError si un DAG reference timedelta via airflow (non utilise ici)
    _ = timedelta


def _load_callable(dag_file: str, fn_name: str):
    path = DAG_DIR / dag_file
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[path.stem] = module
    spec.loader.exec_module(module)
    return getattr(module, fn_name)


def main() -> None:
    _install_airflow_stubs()
    cases = [
        ("dag_patient_import.py", "_run_patient_import", "patient_import"),
        ("dag_analytics_refresh.py", "_run_analytics_refresh", "analytics_refresh"),
        ("dag_ml_features.py", "_run_ml_features", "ml_features"),
        ("dag_sihia_daily.py", "_run_daily", "sihia_daily"),
    ]
    for file_name, fn_name, label in cases:
        print(f"DAG callable {label}...", end=" ")
        fn = _load_callable(file_name, fn_name)
        fn()
        print("OK")
    print("Tous les callables DAG OK")


if __name__ == "__main__":
    main()
