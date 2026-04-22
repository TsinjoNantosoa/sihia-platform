# Module ML prediction flux patients

## Strategie realiste
- V1: Prophet (simple, rapide, interpretable)
- V2: LSTM apres stabilisation des donnees

## Objectif MVP
Predire admissions sur 7 jours et exposer resultat via API.

## Pipeline MVP
1. Extraire historique RDV/admissions
2. Construire features calendaires
3. Entrainer Prophet
4. Evaluer MAE/MAPE
5. Publier endpoint predict

## Metriques minimales
- MAE suivie par semaine
- MAPE cible initiale <= 15%
- Monitoring derive de donnees

## API cible
- POST /api/v1/ml/predict-7d
- GET /api/v1/ml/metrics

## Definition of done ML
- Modele versionne
- Script reentrainement documente
- Prediction visible dans dashboard
- Monitoring de performance actif
