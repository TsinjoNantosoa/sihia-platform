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
