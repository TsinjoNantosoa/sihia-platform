# Architecture cible (simple et evolutive)

## Vue 3 couches
- Frontend: React + TypeScript
- Backend: FastAPI + services metier
- Data: PostgreSQL + Redis

## Composants MVP
- API Gateway logique (dans FastAPI)
- Module Auth
- Module Patients
- Module Medecins
- Module RendezVous
- Module Analytics simple
- Module Prediction (Prophet)

## Principes d architecture
- Separation claire routes / services / repositories / models
- DTO d entree/sortie stricts avec Pydantic
- Migrations Alembic obligatoires
- Logs structures JSON

## Pattern recommande
- Clean Architecture legere
- Monolithe modulaire au debut
- Microservices plus tard seulement si necessaire

## Decisions pratiques
- Commencer monolithique pour livrer vite
- Activer multi-tenant apres stabilite MVP
- Garder les interfaces preparees pour modules IA futurs

## Definition of done architecture
- Diagramme d architecture valide
- Conventions de code ecrites
- Decision records (ADR) pour choix critiques
