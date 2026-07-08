# README_37 — Guide développeur AI BOS

---

## Métadonnées du document

| Champ | Valeur |
|-------|--------|
| **Document** | README_37_DeveloperGuide.md |
| **Projet** | AI BOS — AI Business Operating System |
| **Version** | 0.1.0 |
| **Statut** | `REVIEW` |
| **Audience** | Nouveaux développeurs, Contributeurs, Contractors |
| **Auteur** | AI BOS Engineering Team |
| **Dernière mise à jour** | Juillet 2026 |
| **Documents liés** | [README_39_ProjectStructure](README_39_ProjectStructure.md) · [README_38_CodingStandards](README_38_CodingStandards.md) · [README_40_ImplementationRoadmap](README_40_ImplementationRoadmap.md) |

---

## Table des matières

1. [Bienvenue](#1-bienvenue)
2. [Prérequis](#2-prérequis)
3. [Installation initiale](#3-installation-initiale)
4. [Démarrage local](#4-démarrage-local)
5. [Structure du monorepo](#5-structure-du-monorepo)
6. [Workflow développement](#6-workflow-développement)
7. [Tests](#7-tests)
8. [Contribution](#8-contribution)
9. [Process PR](#9-process-pr)
10. [Dépannage](#10-dépannage)
11. [Ressources](#11-ressources)

---

## 1. Bienvenue

Bienvenue dans l'équipe **AI BOS** ! Ce guide vous permet de contribuer en **moins de 2 heures** depuis un poste neuf.

AI BOS est un **monorepo** combinant :

- **Backend** : FastAPI modulaire (Python 3.12+)
- **Frontend** : React 19 + TypeScript + Vite + TanStack Router
- **CORE platform** : modules transverses (`platform/*`)
- **Apps verticales** : SIH IA en premier (`apps/sihia`)

**Héritage** : le projet démarre par l'extraction du dépôt [`sihia-platform`](../../) — référez-vous à [README_35_MigrationFromSIHIA](README_35_MigrationFromSIHIA.md).

---

## 2. Prérequis

### 2.1 Logiciels requis

| Outil | Version min | Vérification |
|-------|-------------|--------------|
| **Git** | 2.40+ | `git --version` |
| **Node.js** | 22 LTS | `node --version` |
| **pnpm** | 9+ | `pnpm --version` |
| **Python** | 3.12+ | `python --version` |
| **Docker Desktop** | 4.30+ | `docker --version` |
| **Docker Compose** | v2 | `docker compose version` |

### 2.2 Optionnel mais recommandé

| Outil | Usage |
|-------|-------|
| **VS Code / Cursor** | IDE principal |
| **Ruff** (extension) | Lint Python |
| **ESLint** (extension) | Lint TypeScript |
| **PostgreSQL client** | DBeaver, pgAdmin |
| **jq** | Parser logs JSON |

### 2.3 Accès requis

| Accès | Demande à |
|-------|-----------|
| Repo GitHub `ai-bos` | Tech Lead |
| Secrets `.env` (OpenAI, Twilio) | DevOps — vault |
| Datadog staging | SRE |
| Slack `#ai-bos-dev` | Auto après onboarding |

---

## 3. Installation initiale

### 3.1 Clone du dépôt

```bash
git clone https://github.com/your-org/ai-bos.git
cd ai-bos
```

### 3.2 Configuration environnement

```bash
# Copier les templates
cp .env.example .env
cp backend/.env.example backend/.env

# Éditer .env — minimum requis :
# DATABASE_URL=postgresql://aibos:aibos@localhost:5432/aibos
# JWT_SECRET=<générer avec: openssl rand -hex 32>
# OPENAI_API_KEY=sk-... (optionnel pour chatbot)
```

### 3.3 Backend Python

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\pip install -r requirements-dev.txt

# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 3.4 Frontend (pnpm workspaces)

```bash
cd frontend
pnpm install
```

### 3.5 Infrastructure locale

```bash
# Depuis la racine ai-bos
docker compose -f infra/docker-compose.yml up -d postgres redis mailhog
```

### 3.6 Base de données

```bash
cd backend
# Windows
.\venv\Scripts\alembic upgrade head
.\venv\Scripts\python scripts/dev/seed.py

# macOS / Linux
alembic upgrade head
python scripts/dev/seed.py
```

---

## 4. Démarrage local

### 4.1 Équivalent `npm run dev:all` (SIH IA)

SIH IA utilisait :

```json
"dev:all": "concurrently backend uvicorn + vite dev"
```

**AI BOS** — commande unifiée depuis la racine :

```bash
# Option 1 — racine monorepo (recommandé)
pnpm dev:all

# Option 2 — turbo (parallèle optimisé)
pnpm turbo dev

# Option 3 — manuel
pnpm --filter @ai-bos/shell dev &
cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 4.2 Scripts racine (`package.json`)

| Script | Description |
|--------|-------------|
| `pnpm dev:all` | Backend :8000 + Shell UI :5173 |
| `pnpm dev:pilot` | Docker Postgres + seed + dev:all |
| `pnpm build` | Build production frontend |
| `pnpm test` | Tous les tests (frontend + backend) |
| `pnpm test:backend` | `pytest backend/tests` |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm lint` | ESLint + Ruff |
| `pnpm format` | Prettier + Ruff format |

### 4.3 URLs locales

| Service | URL |
|---------|-----|
| Shell UI | http://127.0.0.1:5173 |
| API Backend | http://127.0.0.1:8000 |
| OpenAPI docs | http://127.0.0.1:8000/docs |
| Health details | http://127.0.0.1:8000/health/details |
| MailHog | http://127.0.0.1:8025 |
| pgAdmin (optionnel) | http://127.0.0.1:5050 |

### 4.4 Comptes de test (seed)

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@demo.ai-bos.com` | `Demo123!` | Admin org |
| `doctor@demo.ai-bos.com` | `Demo123!` | Médecin (SIH IA) |
| `viewer@demo.ai-bos.com` | `Demo123!` | Lecture seule |

### 4.5 Mode pilote complet

```bash
pnpm dev:pilot
# Équivalent SIH IA : docker postgres + pilot_setup + dev:all
```

Inclut : PostgreSQL, migrations, seed données santé, MailHog pour emails.

---

## 5. Structure du monorepo

Voir [README_39_ProjectStructure](README_39_ProjectStructure.md) pour l'arborescence complète.

**Résumé rapide** :

```
ai-bos/
├── backend/app/
│   ├── core/           # Config transverse
│   ├── platform/       # CORE modules
│   └── apps/sihia/     # App verticale santé
├── frontend/
│   ├── shell/          # App hôte
│   ├── apps/sihia/     # Micro-frontend
│   └── packages/       # ui, api-client, i18n
├── infra/              # Docker, Terraform
└── Document/           # Cette documentation
```

### 5.1 Où coder quoi

| Tâche | Emplacement |
|-------|-------------|
| Nouvelle route API CORE | `backend/app/platform/{module}/presentation/` |
| Feature SIH IA patients | `backend/app/apps/sihia/` |
| Composant UI partagé | `frontend/packages/ui/` |
| Page dashboard santé | `frontend/apps/sihia/routes/` |
| Migration DB | `backend/alembic/versions/{namespace}/` |
| Test backend | `backend/tests/platform/` ou `tests/apps/sihia/` |

---

## 6. Workflow développement

### 6.1 Branches

| Branche | Usage |
|---------|-------|
| `main` | Production — protégée |
| `develop` | Intégration continue |
| `feature/*` | Nouvelles features |
| `fix/*` | Corrections bugs |
| `migration/*` | Extraction SIH IA |

### 6.2 Cycle feature

```mermaid
flowchart LR
    A[Issue Jira] --> B[feature/ branch]
    B --> C[Code + tests]
    C --> D[PR → develop]
    D --> E[CI verte]
    E --> F[Review 2 approvals]
    F --> G[Merge]
```

### 6.3 Conventions commits

Format **Conventional Commits** :

```
feat(sihia): add patient PATCH endpoint
fix(platform): correlation ID missing on workers
docs: update developer guide
test(auth): add rate limit integration test
refactor(core): extract logging to platform module
```

### 6.4 Développement backend

```bash
cd backend
# Activer venv
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Nouvelle migration
alembic revision -m "add sihia_patients org_id" --version-path alembic/versions/sihia/

# Lint
ruff check .
ruff format .
```

### 6.5 Développement frontend

```bash
cd frontend
pnpm --filter @ai-bos/shell dev
# ou app spécifique
pnpm --filter @ai-bos/sihia dev
```

---

## 7. Tests

### 7.1 Backend (pytest)

```bash
cd backend
pytest tests/ -v
pytest tests/apps/sihia/ -v --cov=app/apps/sihia
pytest tests/platform/identity/ -k "auth"
```

**Objectif couverture** : ≥ 70 % par module.

### 7.2 Frontend (vitest)

```bash
cd frontend
pnpm test
pnpm --filter @ai-bos/api-client test
```

### 7.3 E2E (Playwright)

```bash
cd frontend
pnpm test:e2e
pnpm test:e2e:ui   # mode interactif
```

**Parcours critiques** : login, RBAC par rôle, CRUD patient, chatbot.

### 7.4 Import linter (boundaries)

```bash
cd backend
lint-imports  # vérifie platform ↛ apps.sihia inverse
```

---

## 8. Contribution

### 8.1 Types de contributions

| Type | Process |
|------|---------|
| Bug fix | Issue → PR direct |
| Feature CORE | RFC ou ADR si impact architecture |
| Nouvelle app verticale | Product brief + checklist README_36 |
| Documentation | PR direct, français ou anglais technique |

### 8.2 Definition of Done

- [ ] Code suit [README_38_CodingStandards](README_38_CodingStandards.md)
- [ ] Tests ajoutés ou mis à jour
- [ ] `pnpm lint` + `pytest` passent
- [ ] Pas de secrets committés
- [ ] Documentation mise à jour si API change
- [ ] PR description complète (template)

### 8.3 Code review guidelines

| Règle | Détail |
|-------|--------|
| Taille PR | < 400 lignes idéal, < 800 max |
| Approvals | 2 pour `main`, 1 pour `develop` |
| Délai review | < 24 h ouvrées |
| Tests requis | Tout changement logique |

---

## 9. Process PR

### 9.1 Template PR

```markdown
## Summary
- ...

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs

## Test plan
- [ ] pytest pass
- [ ] vitest pass
- [ ] Manual: ...

## Screenshots (si UI)

## ADR required?
- [ ] Non
- [ ] Oui — lien ADR-XXX
```

### 9.2 CI pipeline (chaque PR)

| Job | Outil | Bloquant |
|-----|-------|----------|
| Lint Python | Ruff | ✅ |
| Lint TypeScript | ESLint | ✅ |
| Type check | mypy + tsc | ✅ |
| Unit tests backend | pytest | ✅ |
| Unit tests frontend | vitest | ✅ |
| Import boundaries | import-linter | ✅ |
| Build frontend | turbo build | ✅ |
| E2E smoke | Playwright (develop only) | 🟡 |

### 9.3 Merge strategy

- **Squash merge** vers `develop`
- **Merge commit** vers `main` (releases)
- Suppression branche après merge

### 9.4 Release process

| Étape | Action |
|-------|--------|
| 1 | `release/vX.Y.Z` branch depuis develop |
| 2 | Changelog + version bump |
| 3 | PR → main, tag `vX.Y.Z` |
| 4 | Deploy staging auto |
| 5 | Validation QA + pilotes |
| 6 | Deploy prod (approval CTO) |

---

## 10. Dépannage

### 10.1 Problèmes fréquents

| Problème | Solution |
|----------|----------|
| `ECONNREFUSED :8000` | Backend non démarré — `pnpm dev:all` |
| `alembic` erreur connexion | `docker compose up -d postgres` |
| CORS errors | Vérifier `CORS_ORIGINS` dans `.env` |
| 401 après login | Vérifier `JWT_SECRET` identique après restart |
| Chatbot ne répond pas | `OPENAI_API_KEY` dans `backend/.env` |
| pnpm workspace not found | Exécuter depuis `frontend/`, pas racine |
| Windows venv paths | Utiliser `.\venv\Scripts\python` pas `python` global |

### 10.2 Reset environnement complet

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d postgres redis
cd backend && alembic upgrade head && python scripts/dev/seed.py
pnpm dev:all
```

### 10.3 Logs debug

```bash
# Backend JSON logs
LOG_LEVEL=DEBUG pnpm dev:all

# Filtrer par correlation_id
pnpm dev:all 2>&1 | jq 'select(.correlation_id=="abc-123")'
```

---

## 11. Ressources

### 11.1 Documentation interne

| Document | Sujet |
|----------|-------|
| [README_39_ProjectStructure](README_39_ProjectStructure.md) | Arborescence |
| [README_38_CodingStandards](README_38_CodingStandards.md) | Standards code |
| [README_35_MigrationFromSIHIA](README_35_MigrationFromSIHIA.md) | Migration |
| [README_04_Backend](README_04_Backend.md) | Architecture backend |
| [README_03_Frontend](README_03_Frontend.md) | Architecture frontend |
| [INDEX.md](INDEX.md) | Index complet |

### 11.2 Référence SIH IA

| Ressource | Chemin |
|-----------|--------|
| État implémentation | `sihia-platform/Document/README_ETAT_IMPLEMENTATION.md` |
| Setup original | `sihia-platform/Document/README_01_Setup_Environnement.md` |

### 11.3 Contacts

| Sujet | Contact |
|-------|---------|
| Onboarding | Tech Lead |
| Accès secrets | DevOps |
| Architecture | Architecture Review Board |
| Product questions | Product Owner |

---

## Onboarding checklist (Jour 1)

- [ ] Accès GitHub + Slack
- [ ] Clone repo + install prérequis
- [ ] `pnpm dev:pilot` fonctionne
- [ ] Login admin demo réussi
- [ ] `pytest` et `pnpm test` passent
- [ ] Lecture README_38 + README_39
- [ ] Première issue assignée dans Jira

---

*Guide maintenu par l'équipe Engineering — signalez les erreurs via PR ou #ai-bos-dev.*
