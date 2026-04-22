# Backend FastAPI (implementation pas a pas)

## Stack
- FastAPI
- SQLAlchemy 2
- Alembic
- Pydantic v2
- Redis (cache/session)

## Sprints backend

### Sprint B1: Auth
- Login JWT
- Refresh token
- Middleware auth
- RBAC de base

### Sprint B2: Patients
- CRUD patients
- Validation metier
- Recherche multi-criteres

### Sprint B3: Medecins
- CRUD medecins
- Disponibilites
- Capacite journaliere

### Sprint B4: Rendez-vous
- CRUD rendez-vous
- Detection conflits horaires
- Statuts (planifie, confirme, annule, termine)

### Sprint B5: Analytics simple
- KPIs: nb patients, nb RDV, taux annulation
- Endpoint dashboard

## Structure conseillee
- app/api/
- app/core/
- app/models/
- app/schemas/
- app/services/
- app/repositories/
- app/tests/

## Definition of done backend
- OpenAPI propre
- Tests unitaires et integration sur endpoints critiques
- Aucune route sans controle d acces
- Journalisation des erreurs et traces
