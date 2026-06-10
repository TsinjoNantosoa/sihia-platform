"""
Execute un pipeline SIH IA (utilisable par Airflow ou en CLI).

Usage :
  python scripts/run_pipeline.py patient_import
  python scripts/run_pipeline.py analytics_refresh
  python scripts/run_pipeline.py ml_features
  python scripts/run_pipeline.py sihia_daily
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.application.pipeline_service import DAG_IDS, PipelineService


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: python scripts/run_pipeline.py <{'|'.join(DAG_IDS)}>", file=sys.stderr)
        sys.exit(1)

    dag_id = sys.argv[1].strip()
    service = PipelineService()
    try:
        result = service.run(dag_id)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
    except Exception as exc:  # noqa: BLE001 — CLI boundary
        print(f"Echec {dag_id}: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"OK {dag_id}")
    print(result)


if __name__ == "__main__":
    main()
