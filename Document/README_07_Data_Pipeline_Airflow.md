# Data pipeline Airflow

## Objectif MVP
Automatiser ingestion, nettoyage et agregation des donnees utiles au dashboard et ML.

## DAGs MVP
1. dag_patient_import
2. dag_analytics_refresh
3. dag_ml_features

## Etapes type
- Extract
- Validate
- Transform
- Load
- Notify

## Regles qualite donnees
- Completeness
- Unicite
- Format
- Coherence
- Fraicheur

## Alertes minimales
- Taux erreur import > 5%
- Donnees non mises a jour > 24h
- Echec DAG critique

## Definition of done pipeline
- DAGs executes selon planning
- Logs exploitables
- Reprise apres erreur documentee
- Tableau simple de qualite de donnees

> **Guide complet (comptes, commandes, tests navigateur) :** [README_AIRFLOW_UTILISATION.md](./README_AIRFLOW_UTILISATION.md)

## Implementation repo (S7)

### DAGs (`airflow/dags/`)
| DAG | Planning | Role |
|-----|----------|------|
| `patient_import` | 6 h | CSV `data/imports/*.csv` → patients |
| `analytics_refresh` | 1 h | Snapshots KPI / revenus / alertes |
| `ml_features` | 12 h | Table `ml_features_daily` |
| `sihia_daily` | 05:00 | Chaine complete |

### CLI (sans Airflow)
```powershell
npm run pipeline:run -- sihia_daily
npm run pipeline:run -- analytics_refresh
```

### API admin
- `GET /api/admin/pipeline/status` — etat + alertes fraicheur
- `POST /api/admin/pipeline/run/{dag_id}` — declenchement manuel

### Docker Airflow (optionnel)
```powershell
$env:POSTGRES_PORT="5435"   # si 5434 occupe
docker compose --profile airflow up -d airflow
# UI : http://localhost:8081 (login affiche dans les logs : docker logs sihia-platform-airflow-1 2>&1 | findstr password)
# Executor : SequentialExecutor (compatible SQLite metadata Airflow)
```

### Verification rapide
```powershell
npm run pipeline:run -- patient_import
cd backend && .\venv\Scripts\python.exe scripts\test_pipeline_manual.py
docker exec sihia-platform-airflow-1 airflow dags list
docker exec sihia-platform-airflow-1 airflow tasks test patient_import import_patients_csv 2026-06-10
```
