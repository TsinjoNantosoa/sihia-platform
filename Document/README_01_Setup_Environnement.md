# Setup environnement (Semaine 1)

## Prerequis
- Git
- Docker Desktop
- Node.js LTS
- Python 3.11
- VS Code

## Arborescence cible
- backend/
- frontend/
- ml/
- infra/
- docs/

## Taches
1. Initialiser le monorepo Git.
2. Creer un fichier .env.example global.
3. Creer docker-compose.yml (api, db, redis, airflow, frontend).
4. Ajouter Makefile ou scripts npm pour commandes standard.
5. Configurer CI basique (lint + tests).

## Variables minimales
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- JWT_EXPIRE_MINUTES
- CORS_ORIGINS

## Critere de validation
- Un seul script demarre tous les services locaux.
- La base PostgreSQL est accessible.
- Une route API health repond 200.
- Le frontend affiche une page de login vide.

## Livrables
- Repository initialise
- docker-compose.yml fonctionnel
- .env.example
- Pipeline CI minimal
