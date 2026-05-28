# État d'implémentation — SIH IA

> **Dernière mise à jour :** 28 mai 2026 (PostgreSQL + Alembic, rate-limit login, audit logs admin, dependency audit CI + upgrade deps)  
> **Sources :** `src/`, `backend/`, dossier `Document/`

Ce document est la **checklist vivante** du projet. Cocher `[x]` uniquement lorsqu'une fonctionnalité est implémentée **et** validée (tests ou vérification manuelle documentée).

---

## Synthèse exécutive

| Indicateur | Évaluation |
|---|---|
| **Démo investisseur / POC UI** | ✅ Prêt |
| **Pilote clinique limité** | 🟡 En cours (données réelles partielles) |
| **Production sécurisée** | 🔴 Non |
| **Couverture fonctionnelle MVP** | **~90 %** |
| **Couverture valeur métier réelle** | **~65 %** |
| **Tests backend** | ✅ **31/31** (`pytest tests/`) |
| **Tests E2E** | ✅ **8/8** Playwright (`npm run test:e2e`) |

---

## Légende

| Symbole | Signification |
|---|---|
| `[x]` | Fait et testé |
| `[ ]` | À faire |
| 🟡 | Partiel |

---

## 1. Frontend

### 1.1 Socle & UX

- [x] React + TypeScript + Vite + TanStack Router / Query
- [x] Design system Calm Care (shadcn, tokens)
- [x] i18n FR / EN / AR + RTL arabe
- [x] Page 403 + focus / labels accessibles
- [x] Login JWT + refresh automatique sur 401

### 1.2 Modules métier

- [x] Dashboard (KPIs, alertes, prochains RDV)
- [x] Patients — liste, création, suppression, détail
- [x] Patients — **édition dossier** (`PATCH` + dialogue « Modifier le dossier »)
- [x] Historique médical — lecture + ajout visite
- [x] Médecins — annuaire, planning, stats (lecture)
- [x] Médecins — **édition planning / disponibilités** (`PATCH` + dialogue « Planning »)
- [x] Rendez-vous — liste, calendrier, création, annulation
- [x] Rendez-vous — détection conflit (chevauchement durée côté API)
- [x] Analytique — graphiques + filtres période
- [x] Analytique — export CSV (client)
- [x] Analytique — export PDF / Excel (API)
- [x] Prédiction — horizons 7j et 30j
- [x] RBAC — page lecture rôles / utilisateurs
- [x] RBAC — admin CRUD users / rôles
- [x] Paramètres — profil, langue, logout / logout-all
- [x] Guards routes (`requireRoutePermission`)
- [x] Guards actions (`PermissionGuard`)

### 1.3 Qualité front

- [x] Tests E2E Playwright (RBAC API + navigation UI par rôle)
- [x] Mode mock **opt-in** (`VITE_USE_MOCKS=true` + erreur réseau)
- [x] Mode prod : mocks ignorés si `PROD=true`

---

## 2. Backend

### 2.1 Socle

- [x] Architecture en couches (application / domain / infrastructure / presentation)
- [x] SQLite persistant (`app.db`) — dev local
- [x] PostgreSQL + migrations Alembic (`alembic/versions/001_initial_schema.py`)
- [x] Couche SQL unifiée SQLAlchemy (`database.py`) — SQLite ou PostgreSQL via `DATABASE_URL`
- [x] Erreurs HTTP normalisées `{ code, message, details }`
- [x] Health `/health` et `/health/details`
- [x] CORS configurable (`CORS_ORIGINS`)
- [x] Config via variables d'environnement (`.env.example`)
- [x] Middleware **X-Correlation-ID**
- [x] En-têtes sécurité HTTP (nosniff, frame deny, HSTS prod)
- [ ] Logs structurés + métriques

### 2.2 Auth & RBAC

- [x] Login / refresh / logout / logout-all
- [x] Rotation refresh token
- [x] Permissions dans le JWT
- [x] Rate limit login (`POST /api/auth/login`) — 5 échecs / 5 min / IP+email
- [x] Audit logs admin (`rbac.user.create|update|delete`, `auth.logout_all`)
- [x] `require_permission` sur routes métier
- [x] Liste RBAC users depuis **table `users`** (plus de liste statique)
- [x] CRUD utilisateurs : `POST/PATCH/DELETE /api/rbac/users` (admin)
- [x] Statut compte `active` / `suspended` (blocage login si suspendu)

### 2.3 API métier

| Endpoint | Statut |
|---|---|
| `POST /api/auth/*` | [x] |
| `GET/POST/DELETE /api/patients` | [x] |
| `PATCH /api/patients/{id}` | [x] **nouveau** |
| `GET/POST /api/patients/{id}/history` | [x] |
| `GET /api/doctors` | [x] |
| `PATCH /api/doctors/{id}` | [x] **nouveau** |
| `GET/POST /api/appointments` | [x] |
| `POST /api/appointments/{id}/cancel` | [x] |
| `GET /api/analytics/*` | [x] données **calculées SQLite** |
| `GET /api/analytics/export/*` | [x] |
| `GET /api/ml/predict-7d` / `predict-30d` | [x] 🟡 **série RDV SQLite** + régression linéaire (Prophet optionnel) |
| `GET /api/alerts` | [x] **dynamiques** (seuils occupation / file RDV) |
| `GET/POST/PATCH/DELETE /api/rbac/users` | [x] **nouveau** |

### 2.4 Données & analytics

- [x] KPIs dérivés des RDV / patients en base
- [x] Champ `updatedAt` + `source: sqlite` sur les KPIs
- [x] Revenus estimés depuis volume RDV × tarif moyen
- [x] Admissions par spécialité médecin
- [x] Satisfaction dérivée des médecins en base
- [x] Prévisions 7j/30j depuis historique RDV (`ml_service.py`, `source: sqlite`)
- [ ] Prophet installé en prod (`pip install -r requirements-ml.txt`)

---

## 3. Tests (backend)

| Fichier | Tests | Statut |
|---|---|---|
| `tests/test_auth_security.py` | 6 | [x] |
| `tests/test_rbac_routes.py` | 3 | [x] |
| `tests/test_patients_update.py` | 2 | [x] **nouveau** |
| `tests/test_analytics_dynamic.py` | 3 | [x] **nouveau** |
| `tests/test_appointment_overlap.py` | 1 | [x] **nouveau** |
| `tests/test_exports.py` | 2 | [x] |
| `tests/test_doctors_update.py` | 3 | [x] |
| `tests/test_rbac_users_crud.py` | 4 | [x] |
| `tests/test_ml_forecast.py` | 3 | [x] **nouveau** |
| `tests/test_auth_rate_limit.py` | 2 | [x] **nouveau** |
| `tests/test_admin_audit_logs.py` | 2 | [x] **nouveau** |

**Commandes :**

```bash
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v

# E2E (backend + front démarrés ou laisser Playwright les lancer)
cd ..
npm run test:e2e
```

### pgAdmin 4 (Docker)

```bash
docker compose up -d postgres pgadmin
# ou stack complet : docker compose up -d
```

| Accès | Valeur |
|---|---|
| URL | http://localhost:5050 |
| Email | `admin@sihia.health` |
| Mot de passe | `admin` |
| Serveur préconfiguré | **SIH IA (PostgreSQL)** → host `postgres`, DB `sihia`, user `sihia` / `sihia` |

Si le port **5050** est déjà pris : `PGADMIN_PORT=5051` dans `.env` puis `docker compose up -d pgadmin`.

**pgAdmin 4 installé sur Windows** (pas le conteneur) : utilise le port **5434** (pas 5432 — souvent pris par PostgreSQL Windows).

| Champ | Valeur |
|---|---|
| Host | `localhost` |
| Port | **5434** |
| Database | `sihia` |
| Username | `sihia` |
| Password | `sihia` |

### App sur PostgreSQL + migration SQLite

`backend/.env` :

```env
DATABASE_URL=postgresql://sihia:sihia@localhost:5434/sihia
```

Copier les données de `app.db` vers Postgres :

```bash
npm run migrate:pg
```

---

## 4. Backlog priorisé

### P0 — Stabilisation (S1)

- [x] Mocks non utilisés en prod sans flag explicite
- [x] RBAC users réels depuis la DB
- [x] Config secrets / CORS documentée (`.env.example` backend)
- [x] Tests E2E par rôle (Playwright `e2e/`)
- [x] PostgreSQL + migrations
- [x] Checklist OWASP MVP (`Document/SECURITY_CHECKLIST.md`) 🟡
- [x] Scan dépendances en CI (`pip-audit` + `npm audit --omit=dev --audit-level=moderate`)
- [x] Upgrade dépendances frontend + seuil `npm audit` à `moderate` (0 vulnérabilité restante)

### P1 — Valeur métier (S2)

- [x] Analytics agrégés depuis SQLite
- [x] Patient `PATCH` + UI édition
- [x] Conflits RDV par chevauchement de créneaux
- [x] Admin users / rôles (CRUD)
- [x] Pipeline prévision 7j/30j depuis SQLite 🟡 (linéaire ; Prophet optionnel)
- [x] Édition médecins / planning

### P2 — Plateforme & V2 (S3+)

- [x] Docker Compose (`docker-compose.yml` + Dockerfiles)
- [x] CI/CD GitHub Actions (`.github/workflows/ci.yml`)
- [ ] Airflow (DAGs import / refresh)
- [ ] Chatbot RAG + guardrails
- [ ] Rappels RDV (email / SMS)
- [ ] HL7 FHIR, mobile, marketplace (hors MVP)

---

## 5. Matrice modules (cahier vs code)

| Module | Statut | Notes |
|---|---|---|
| Auth + session | ✅ | JWT + refresh + tests |
| Patients | ✅ | CRUD complet + historique |
| Médecins | ✅ | Lecture + édition planning / dispo |
| Rendez-vous | 🟡 | Conflits durée OK ; pas de rappels |
| Dashboard KPI | 🟡 | KPIs réels ; ML encore statique |
| Analytique | 🟡 | Agrégats réels ; pas BI avancée |
| Prédiction IA | 🟡 | Prévisions depuis RDV réels ; Prophet optionnel |
| RBAC | ✅ | Guards + CRUD admin utilisateurs |
| i18n + a11y | ✅ | |
| Chatbot | ❌ | |
| Data pipeline | ❌ | |
| DevOps | 🟡 | Docker + CI ; pas encore déploiement cloud |

---

## 6. Roadmap 12 semaines (rappel)

| Semaine | Objectif doc | Fait |
|---|---|---|
| S1 | Setup, compose, CI | 🟡 repo OK |
| S2 | Auth JWT | [x] |
| S3–S4 | CRUD patients / médecins | [x] |
| S5 | RDV + conflits | [x] |
| S6 | Dashboard + exports | [x] |
| S7 | Airflow | [ ] |
| S8–S9 | Prophet + ML dashboard | [ ] |
| S10 | Hardening sécurité | 🟡 |
| S11 | E2E | [x] |
| S12 | Démo pilote | 🟡 |

---

## 7. Journal des changements récents

| Date | Changement | Tests |
|---|---|---|
| 2026-05-26 | ML 7j/30j depuis SQLite ; Docker Compose ; CI GitHub ; E2E Playwright ; sécurité HTTP | `test_ml_forecast.py` + `e2e/` (8) |
| 2026-05-26 | CRUD `/api/rbac/users` + UI admin (créer / modifier / supprimer / suspendre) | `test_rbac_users_crud.py` (4) |
| 2026-05-26 | `PATCH /api/patients/{id}` + UI édition dossier | `test_patients_update.py` |
| 2026-05-26 | Analytics KPI / revenus / alertes depuis SQLite | `test_analytics_dynamic.py` |
| 2026-05-28 | Hardening sécurité: rate-limit login + audit logs admin + scan dépendances CI | `test_auth_rate_limit.py`, `test_admin_audit_logs.py`, `.github/workflows/ci.yml` |
| 2026-05-28 | Upgrade npm deps de sécurité + audit `moderate` clean (0 vulnérabilité) | `npm audit fix`, `npm run audit:deps`, `npm run test:rbac`, `npm run build` |
| 2026-05-26 | Conflit RDV par chevauchement de durée | `test_appointment_overlap.py` |
| 2026-05-26 | RBAC users depuis DB ; CORS + JWT env ; Correlation-ID | pytest 15/15 |
| 2026-05-26 | `httpx` ajouté à `requirements.txt` pour TestClient | — |
| 2026-05-26 | Exports PDF/Excel déplacés en `tests/test_exports.py` | 2 tests |
| 2026-05-26 | `PATCH /api/doctors/{id}` + UI planning (admin/manager) | `test_doctors_update.py` (3) |

---

## 8. Maintenance

1. Implémenter une tâche du backlog.
2. Ajouter ou mettre à jour un test dans `backend/tests/`.
3. Lancer `pytest tests/ -v`.
4. Cocher `[x]` dans ce fichier et ajouter une ligne au **journal §7**.

**Documents liés :** `README_00_Vision_Scope.md`, `README_FUTUR_IMPLEMENTATION.md`, `README_15_Gap_Analysis_Front_vs_Cahier.md`, `../README.md`.
