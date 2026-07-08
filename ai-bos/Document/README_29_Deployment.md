# AI BOS — Stratégies de déploiement

> **Version:** 0.1.0 | **Statut:** `DESIGN` | **Maturité:** `ALPHA`  
> **Dernière mise à jour:** Juillet 2026  
> **Audience:** SRE, Backend Engineers, Release Managers  
> **Référence héritage:** [docker-compose.yml](../../sihia-platform/docker-compose.yml), [README_27_DevOps](README_27_DevOps.md), [README_28_Cloud](README_28_Cloud.md)

---

## Table des matières

1. [Objectif](#1-objectif)
2. [Environnements](#2-environnements)
3. [Conteneurisation Docker](#3-conteneurisation-docker)
4. [Stratégie blue-green](#4-stratégie-blue-green)
5. [Stratégie canary](#5-stratégie-canary)
6. [Rolling deployment](#6-rolling-deployment)
7. [Migrations base de données](#7-migrations-base-de-données)
8. [Feature flags](#8-feature-flags)
9. [Rollback](#9-rollback)
10. [Checklist pré/post deploy](#10-checklist-prépost-deploy)
11. [ADRs](#11-adrs)
12. [Checklist de livraison](#12-checklist-de-livraison)

---

## 1. Objectif

Ce document définit les **stratégies de déploiement** AI BOS : environnements isolés, conteneurisation, zero-downtime deployments et procédures de rollback. Il étend `docker-compose` SIH IA vers des déploiements production sur AWS ECS.

### Objectifs opérationnels

| Objectif | Cible |
|----------|-------|
| Disponibilité deploy | 99.9 % (pas de downtime planifié) |
| Durée deploy prod | < 15 min |
| Rollback | < 5 min |
| RTO incident deploy | < 30 min |

---

## 2. Environnements

### Matrice environnements

| Env | Branch / Trigger | Infra | Données | Accès |
|-----|------------------|-------|---------|-------|
| **local** | développeur | docker-compose | seed dev | localhost |
| **dev** | feature branches | ECS minimal | anonymisées | équipe dev |
| **staging** | `main` push | ECS parité prod | copie masquée | QA + stakeholders |
| **prod** | tag `v*.*.*` | ECS Multi-AZ | réelles | clients |

### Flux promotion

```
local ──PR──▶ dev ──auto──▶ staging ──manual approval──▶ prod
                  │              │                          │
                  └──────────────┴──────────────────────────┘
                              CI identique
```

### Variables par environnement

| Variable | local | staging | prod |
|----------|-------|---------|------|
| `ENVIRONMENT` | development | staging | production |
| `DATABASE_URL` | docker postgres | RDS staging | RDS prod |
| `JWT_SECRET` | .env local | Secrets Manager | Secrets Manager roté |
| `CORS_ORIGINS` | localhost:8080 | staging.aibos.io | app.aibos.io |
| `NOTIFICATION_EMAIL_MODE` | log / mailhog | smtp (SES sandbox) | smtp (SES) |
| `ML_USE_PROPHET` | true | true | true |

---

## 3. Conteneurisation Docker

### Héritage docker-compose SIH IA

```yaml
# sihia-platform/docker-compose.yml — référence
services:
  postgres:
    image: postgres:16-alpine
    ports: ["${POSTGRES_PORT:-5434}:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sihia -d sihia"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://sihia:sihia@postgres:5432/sihia
    depends_on:
      postgres: { condition: service_healthy }

  frontend:
    build: { context: ., args: { VITE_API_URL: http://localhost:8000 } }
    ports: ["8080:8080"]
    depends_on: [backend]

  mailhog:
    profiles: [mailhog]

  airflow:
    profiles: [airflow]
```

### docker-compose AI BOS (cible)

```yaml
# docker-compose.yml — AI BOS
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aibos
      POSTGRES_PASSWORD: aibos
      POSTGRES_DB: aibos
    ports: ["${POSTGRES_PORT:-5434}:5432"]
    volumes: [pg_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aibos -d aibos"]
      interval: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    profiles: [storage]

  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      discovery.type: single-node
      DISABLE_SECURITY_PLUGIN: "true"
    ports: ["9200:9200"]
    profiles: [search]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports: ["8000:8000"]
    environment:
      ENVIRONMENT: development
      DATABASE_URL: postgresql://aibos:aibos@postgres:5432/aibos
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET: ${JWT_SECRET:-dev-docker-secret-minimum-32-chars}
      CORS_ORIGINS: http://localhost:8080,http://127.0.0.1:8080
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  worker:
    build: ./backend
    command: celery -A app.worker worker -l info
    environment:
      DATABASE_URL: postgresql://aibos:aibos@postgres:5432/aibos
      REDIS_URL: redis://redis:6379/0
    depends_on: [backend, redis]
    profiles: [workers]

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:8000
    ports: ["8080:8080"]
    depends_on: [backend]

  mailhog:
    image: mailhog/mailhog:v1.0.1
    ports: ["1025:1025", "8025:8025"]
    profiles: [mailhog]

volumes:
  pg_data:
```

### Profils docker-compose

| Profil | Services | Usage |
|--------|----------|-------|
| (default) | postgres, redis, backend, frontend | Dev quotidien |
| `mailhog` | + mailhog | Test emails |
| `storage` | + minio | Test S3 local |
| `search` | + opensearch | Test recherche |
| `workers` | + celery worker | Jobs async |
| `full` | tous | Intégration complète |

```bash
docker compose --profile mailhog --profile workers up -d
```

### Dockerfiles

**Backend :**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Backend ML (image séparée) :**

```dockerfile
FROM python:3.12-slim
COPY requirements-ml.txt .
RUN pip install -r requirements-ml.txt   # prophet, pandas
```

**Frontend :**

```dockerfile
FROM node:22-alpine AS build
ARG VITE_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

---

## 4. Stratégie blue-green

### Principe

```
                    ┌─────────────┐
   ALB ────────────▶│   Blue      │  v1.2.2 (production actuelle)
                    │  (100%)     │
                    └─────────────┘

   Deploy v1.2.3 ──▶┌─────────────┐
                    │   Green     │  v1.2.3 (nouvelle version)
                    │  (0% → test)│
                    └─────────────┘

   Switch ─────────▶ Green 100%, Blue standby
```

### Implémentation ECS

| Étape | Action |
|-------|--------|
| 1 | Créer service ECS `aibos-api-green` avec nouvelle task definition |
| 2 | Smoke tests internes (health, auth, KPI) |
| 3 | Modifier listener ALB : forward 100 % → green target group |
| 4 | Monitorer 15 min (error rate, latency) |
| 5 | Scale down blue ou conserver standby 24 h |

### Quand utiliser

- Releases majeures (migrations DB, breaking API)
- Rollback rapide requis
- Fenêtre maintenance acceptable pour switch DNS interne

---

## 5. Stratégie canary

### Principe

```
ALB weighted routing:
  v1.2.2 (stable) : 90%
  v1.2.3 (canary) : 10%

Si métriques OK après 15 min:
  50% / 50% → puis 0% / 100%
```

### Métriques gate canary

| Métrique | Seuil rollback |
|----------|----------------|
| HTTP 5xx rate | > 0.5 % |
| p95 latency | > 2× baseline |
| Business KPI | anomaly detection |
| JWT auth failures | > 1 % |

### Implémentation

- **ECS** : CodeDeploy blue/green avec traffic shifting
- **CloudWatch alarms** : déclenchement rollback auto
- **Feature flags** : canary par tenant (beta testers)

### Quand utiliser

- Releases mineures fréquentes
- Changements UI/frontend
- Nouvelles features à risque modéré

---

## 6. Rolling deployment

### Comportement ECS default

```
Desired count: 4 tasks
  1. Stop task 1, start new version
  2. Wait healthy
  3. Repeat pour tasks 2, 3, 4
```

### Configuration

```hcl
deployment_configuration {
  maximum_percent         = 200
  minimum_healthy_percent = 100
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

### Quand utiliser

- Patches sécurité dépendances
- Fixes bug non-breaking
- Environnements dev/staging

---

## 7. Migrations base de données

### Pipeline Alembic

```bash
# Pre-deploy (staging validé)
alembic upgrade head

# Règles
# - Migrations backward-compatible (expand-contract)
# - Pas de DROP COLUMN en prod sans phase dépréciation
# - Backup RDS snapshot avant deploy prod
```

### Pattern expand-contract

```
Release N:   ADD column nullable
Release N+1: Backfill data, dual-write
Release N+2: Switch read to new column
Release N+3: DROP old column
```

### Héritage SIH IA

Migrations existantes : `alembic/versions/001_*.py` → `003_pipeline_tables.py`

---

## 8. Feature flags

| Flag | Env default | Description |
|------|-------------|-------------|
| `ML_USE_PROPHET` | true staging | Prophet forecasting |
| `SEARCH_SEMANTIC` | false dev | Hybrid search |
| `BI_NL_SQL` | false | NL-to-SQL beta |
| `NOTIFICATION_PUSH` | false | Push notifications |

Stockage : table `feature_flags` + cache Redis ; override par tenant (README_20).

---

## 9. Rollback

### Niveaux rollback

| Niveau | Durée | Action |
|--------|-------|--------|
| L1 — Traffic | < 1 min | ALB revert vers blue |
| L2 — Image | < 5 min | Deploy tag précédent ECR |
| L3 — Database | 15-60 min | Restore RDS snapshot |
| L4 — Full | 1-4 h | DR region failover |

### Commandes ECS rollback

```bash
# Lister revisions
aws ecs list-task-definitions --family aibos-api

# Rollback
aws ecs update-service \
  --cluster aibos-prod \
  --service aibos-api \
  --task-definition aibos-api:42   # revision précédente
```

### Critères rollback automatique

- Circuit breaker ECS déclenché
- Alarme CloudWatch 5xx > seuil
- Health check `/health` fail > 3 min

---

## 10. Checklist pré/post deploy

### Pré-deploy prod

- [ ] CI green sur commit tagué
- [ ] Staging validé QA (smoke + regression)
- [ ] Changelog et release notes publiés
- [ ] Migration Alembic testée staging
- [ ] RDS snapshot manuel déclenché
- [ ] Feature flags revus
- [ ] Équipe on-call notifiée
- [ ] Fenêtre deploy communiquée (si impact)

### Post-deploy prod

- [ ] `/health` et `/health/details` OK
- [ ] Smoke : login, KPI, search, notification log
- [ ] Métriques 5xx, latency baseline
- [ ] Pas d'alerte Prometheus/CloudWatch
- [ ] Canary promu ou blue-green switch confirmé
- [ ] Tag GitHub Release créé

### Smoke tests automatisés

```bash
# scripts/smoke-prod.sh
curl -sf https://app.aibos.io/health
curl -sf -H "Authorization: Bearer $SMOKE_TOKEN" \
  https://app.aibos.io/api/v1/analytics/kpis
```

---

## 11. ADRs

### ADR-029-001 : Canary par défaut en prod

**Décision :** Releases prod utilisent canary 10→50→100 % sauf migrations majeures.  
**Alternatives :** Rolling only, blue-green systématique.  
**Conséquences :** CodeDeploy requis ; monitoring renforcé.

### ADR-029-002 : docker-compose parité services

**Décision :** Tout service AWS a un équivalent docker-compose (ou profile).  
**Contexte :** DX développeurs, CI e2e.  
**Conséquences :** Maintenance compose synchronisée avec Terraform.

### ADR-029-003 : Migrations avant traffic shift

**Décision :** `alembic upgrade` avant bascule trafic canary.  
**Contexte :** Éviter code nouveau sur schema ancien.  
**Conséquences :** Migrations doivent être backward-compatible.

---

## 12. Checklist de livraison

- [ ] docker-compose AI BOS avec profils
- [ ] Dockerfiles backend, frontend, worker, backend-ml
- [ ] ECS task definitions staging + prod
- [ ] CodeDeploy canary configuré
- [ ] Blue-green runbook documenté
- [ ] Alembic pipeline CD intégré
- [ ] Smoke tests post-deploy automatisés
- [ ] Rollback testé en staging
- [ ] Feature flags table + API
- [ ] Documentation environnements pour développeurs

---

*Document maintenu par l'équipe Platform — AI BOS.*
