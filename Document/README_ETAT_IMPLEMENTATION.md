# État d'implémentation — SIH IA

> **Dernière mise à jour :** 2 juillet 2026 (chatbot RAG + widget H4H intégré)  
> **Sources :** `src/`, `backend/`, dossier `Document/`

Ce document est la **checklist vivante** du projet. Cocher `[x]` uniquement lorsqu'une fonctionnalité est implémentée **et** validée (tests ou vérification manuelle documentée).

---

## Synthèse exécutive

| Indicateur | Évaluation |
|---|---|
| **Démo investisseur / POC UI** | ✅ Prêt |
| **Pilote clinique limité** | 🟡 Postgres local validé (`npm run pilot:setup`) |
| **Production sécurisée** | 🔴 Non |
| **Couverture fonctionnelle MVP** | **~95 %** |
| **Couverture valeur métier réelle** | **~70 %** |
| **Tests backend** | ✅ **68/68** (`pytest tests/`) |
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
- [x] Hydratation i18n SSR (`I18nHydrator`, `skipHydration` Zustand — plus de mismatch login)
- [x] Page 403 + focus / labels accessibles
- [x] Login JWT + refresh automatique sur 401

### 1.2 Modules métier

- [x] Dashboard (KPIs, alertes, prochains RDV)
- [x] Dashboard — **métadonnées ML** (modèle, version, confiance, source SQL, fraîcheur, bande intervalle, recommandation)
- [x] Patients — liste, création, suppression, détail
- [x] Patients — **édition dossier** (`PATCH` + dialogue « Modifier le dossier »)
- [x] Historique médical — lecture + ajout visite
- [x] Médecins — annuaire, planning, stats (lecture)
- [x] Médecins — **édition planning / disponibilités** (`PATCH` + dialogue « Planning »)
- [x] Rendez-vous — liste, calendrier, création, annulation
- [x] Rendez-vous — détection conflit (chevauchement durée côté API)
- [x] Rendez-vous — **rappels email/SMS** (log dev, **SMTP/Twilio configurables**, audit JSONL, UI statut canaux)
- [x] Analytique — graphiques + filtres période
- [x] Analytique — export CSV (client)
- [x] Analytique — export PDF / Excel (API)
- [x] Prédiction — horizons 7j et 30j
- [x] Prédiction — **métriques modèle** (`GET /api/ml/metrics` : MAE, MAPE, holdout 7j, cible ≤ 15 %)
- [x] RBAC — page lecture rôles / utilisateurs
- [x] RBAC — admin CRUD users / rôles
- [x] Paramètres — profil, langue, logout / logout-all
- [x] Guards routes (`requireRoutePermission`)
- [x] Paramètres — **pipeline admin UI** (`PipelineAdminPanel`, statut DAGs, lancer runs)
- [x] Paramètres — **statut canaux rappels** + lien MailHog
- [x] **Chatbot médical** — widget flottant H4H (`SihiaChatbot`, streaming SSE, FR/EN, guardrails)
- [x] UX 401/403 centralisée (`httpErrors.ts` : toast i18n, redirection, exports blob)

### 1.3 Qualité front

- [x] Tests E2E Playwright (RBAC API + navigation UI par rôle)
- [x] Mode mock **opt-in** (`VITE_USE_MOCKS=true` + erreur réseau)
- [x] Mode prod : mocks ignorés si `PROD=true`

---

## 2. Backend

### 2.1 Socle

- [x] Architecture en couches (application / domain / infrastructure / presentation)
- [x] SQLite persistant (`app.db`) — dev local
- [x] PostgreSQL + migrations Alembic (`001` schéma, `002` rappels RDV, `003` pipeline)
- [x] Couche SQL unifiée SQLAlchemy (`database.py`) — SQLite ou PostgreSQL via `DATABASE_URL`
- [x] Erreurs HTTP normalisées `{ code, message, details }`
- [x] Health `/health` et `/health/details`
- [x] CORS configurable (`CORS_ORIGINS`)
- [x] Config via variables d'environnement (`.env.example`)
- [x] Middleware **X-Correlation-ID**
- [x] En-têtes sécurité HTTP (nosniff, frame deny, HSTS prod)
- [x] Logs structurés JSON (`logging_config.py`, requêtes HTTP + audit admin)
- [x] Métriques pilote (`metrics.py` exposées sur `/health/details`, compteurs 401/403)
- [x] État pipeline sur `/health/details` (`pipeline.freshness`, alertes DAG)

### 2.2 Auth & RBAC

- [x] Login / refresh / logout / logout-all
- [x] Rotation refresh token
- [x] Permissions dans le JWT
- [x] Rate limit login (`POST /api/auth/login`) — 5 échecs / 5 min / IP+email
- [x] Audit logs admin (`rbac.user.create|update|delete`, `auth.logout_all`)
- [x] Export logs d'audit (`GET /api/admin/audit-logs/export`, fichier `logs/audit.jsonl`)
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
| `POST /api/appointments/{id}/remind` | [x] **nouveau** |
| `GET /api/appointments/{id}/reminders` | [x] **nouveau** |
| `POST /api/admin/reminders/run` | [x] (lot J-1 / 24h) |
| `GET /api/admin/reminders/status` | [x] **nouveau** — modes email/SMS, SMTP/Twilio ready |
| `GET /api/admin/pipeline/status` | [x] **nouveau** |
| `POST /api/admin/pipeline/run/{dag_id}` | [x] **nouveau** |
| `GET /api/analytics/*` | [x] données **calculées depuis la base SQL** (SQLite ou PostgreSQL) |
| `GET /api/analytics/export/*` | [x] |
| `GET /api/ml/predict-7d` / `predict-30d` | [x] série RDV réelle + Prophet/linéaire + `generatedAt`, `model_version`, bande confiance |
| `GET /api/ml/metrics` | [x] **nouveau** — MAE/MAPE holdout 7j, statut ok/degraded |
| `GET /api/alerts` | [x] **dynamiques** (seuils occupation / file RDV) |
| `GET/POST/PATCH/DELETE /api/rbac/users` | [x] |
| `GET /ui-config` | [x] **chatbot** — branding widget |
| `GET /history` | [x] **chatbot** — historique session |
| `POST /query-stream` | [x] **chatbot** — réponses SSE OpenAI + RAG + guardrails |

### 2.4 Données & analytics

- [x] KPIs dérivés des RDV / patients en base
- [x] Champ `updatedAt` + `source: sqlite` sur les KPIs
- [x] Revenus estimés depuis volume RDV × tarif moyen
- [x] Admissions par spécialité médecin
- [x] Satisfaction dérivée des médecins en base
- [x] Prévisions 7j/30j depuis historique RDV (`ml_service.py`, `source: sqlite`)
- [x] Prophet optionnel (`requirements-ml.txt`, `ML_USE_PROPHET`, fallback linéaire)
- [x] Rappels RDV (`reminder_service`, migration `002`, log `reminders.jsonl`)
- [x] Pipeline données (`pipeline_service`, migration `003`, snapshots analytics, `ml_features_daily`)
- [x] Pilote PostgreSQL (`pilot_setup.py`, `npm run pilot:setup`, port 5435 si 5434 occupé)
- [x] Chatbot RAG (`chatbot_service`, `chatbot_knowledge.json`, audit `chatbot.jsonl`, rate limit 20/min)

---

## 3. Tests (backend)

| Fichier | Tests | Statut |
|---|---|---|
| `tests/test_auth_security.py` | 6 | [x] |
| `tests/test_rbac_routes.py` | 3 | [x] |
| `tests/test_patients_update.py` | 2 | [x] **nouveau** |
| `tests/test_analytics_dynamic.py` | 3 | [x] **nouveau** |
| `tests/test_appointment_overlap.py` | 1 | [x] **nouveau** |
| `tests/test_reminders.py` | 4 | [x] |
| `tests/test_notification_channels.py` | 5 | [x] **nouveau** |
| `tests/test_pipeline.py` | 7 | [x] **nouveau** |
| `tests/test_exports.py` | 2 | [x] |
| `tests/test_doctors_update.py` | 3 | [x] |
| `tests/test_rbac_users_crud.py` | 4 | [x] |
| `tests/test_ml_forecast.py` | 3 | [x] **nouveau** |
| `tests/test_auth_rate_limit.py` | 2 | [x] **nouveau** |
| `tests/test_admin_audit_logs.py` | 2 | [x] **nouveau** |
| `tests/test_health_details.py` | 3 | [x] **nouveau** |
| `tests/test_audit_export.py` | 2 | [x] **nouveau** |
| `tests/test_ml_engine.py` | 4 | [x] |
| `tests/test_ml_metrics.py` | 2 | [x] |
| `tests/test_chatbot.py` | 8 | [x] **nouveau** |

**Commandes :**

```bash
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v

# E2E (backend + front démarrés ou laisser Playwright les lancer)
cd ..
npm run test:e2e

# Pilote PostgreSQL, pipeline données, Airflow
npm run pilot:setup
npm run dev:pilot
npm run pipeline:run -- sihia_daily
npm run airflow:up
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

**pgAdmin 4 installé sur Windows** (pas le conteneur) : port **5434** ou **5435** si 5434 occupé (`POSTGRES_PORT` dans `.env`).

| Champ | Valeur |
|---|---|
| Host | `localhost` |
| Port | **5434** ou **5435** |
| Database | `sihia` |
| Username | `sihia` |
| Password | `sihia` |

### App sur PostgreSQL + migration SQLite

`backend/.env` (pilote local — `pilot_setup.py` utilise `pg8000`) :

```env
DATABASE_URL=postgresql+pg8000://sihia:sihia@localhost:5435/sihia
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
- [x] Airflow (DAGs import / refresh / ML features + CLI `pipeline:run`)
- [x] Chatbot RAG + guardrails (widget H4H, OpenAI streaming, escalade urgence 15/112)
- [x] Rappels RDV (email / SMS — log, **SMTP** via MailHog/prod, **Twilio** optionnel)
- [ ] HL7 FHIR, mobile, marketplace (hors MVP)

---

## 5. Matrice modules (cahier vs code)

| Module | Statut | Notes |
|---|---|---|
| Auth + session | ✅ | JWT + refresh + tests |
| Patients | ✅ | CRUD complet + historique |
| Médecins | ✅ | Lecture + édition planning / dispo |
| Rendez-vous | ✅ | Conflits + rappels email/SMS (log / SMTP / Twilio) |
| Dashboard KPI | ✅ | KPIs réels ; prévisions ML 7j avec métadonnées modèle et intervalle de confiance |
| Analytique | 🟡 | Agrégats réels ; pas BI avancée |
| Prédiction IA | ✅ | Prévisions 7j/30j depuis RDV réels ; Prophet optionnel ; métadonnées exposées API + UI |
| RBAC | ✅ | Guards + CRUD admin utilisateurs |
| i18n + a11y | ✅ | |
| Chatbot | ✅ | Widget H4H intégré, RAG JSON, guardrails, audit, 8 tests |
| Data pipeline | ✅ | DAGs Airflow + API + **UI admin Paramètres** |
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
| S7 | Airflow | [x] DAGs + `pipeline_service` + Docker profile `airflow` |
| S8–S9 | Prophet + ML dashboard | [x] Prophet activable ; dashboard + page prédiction avec métadonnées ML |
| S10 | Hardening sécurité | 🟡 logs + métriques OK ; vault / ELK restants |
| S11 | E2E | [x] |
| S12 | Démo pilote | [x] `pilot:setup`, Postgres pg8000, `/health/details` → `postgresql` |

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
| 2026-05-29 | `/health/details` réel (DB ping, type Postgres/SQLite, ML prophet/linear) + logs JSON + métriques 403 | `test_health_details.py` (3) |
| 2026-05-29 | Pilote local documenté (`README_01`), script `npm run dev:pilot`, validation `/health/details` → `postgresql` | vérif manuelle |
| 2026-05-29 | Fix hydratation React login (locale localStorage vs SSR fr) | `I18nHydrator`, `tests/i18n-hydration.test.ts` |
| 2026-05-29 | Balayage UX 403/401 : toasts i18n, `ApiAuthError`, exports PDF/Excel, page `/403` | `httpErrors.ts`, `tests/http-errors.test.ts` |
| 2026-05-29 | Fix login → 403 : repli permissions par rôle + resync JWT au rehydrate | `rbac.ts`, `auth/store.ts` |
| 2026-05-29 | Fix staff login : dashboard sans appels analytics/ML ; API 403 = toast seul | `dashboard.tsx`, `httpErrors.ts` |
| 2026-05-29 | Export logs audit JSONL + API admin + bouton RBAC | `audit_log.py`, `test_audit_export.py` |
| 2026-06-10 | Guide Airflow + tests navigateur (`README_AIRFLOW_UTILISATION.md`) | — |
| 2026-06-10 | Airflow S7 (`pipeline_service`, 4 DAGs, import CSV, snapshots, `npm run pipeline:run`) | `test_pipeline.py` (7) |
| 2026-06-10 | Rappels RDV email/SMS (`reminder_service`, lot 24h, UI rendez-vous) | `test_reminders.py` (4) |
| 2026-06-10 | Pilote S12 PostgreSQL (`pilot_setup.py`, `npm run pilot:setup`, port 5435 si 5434 occupé) | `pilot:setup` manuel, `/health/details` postgresql, login + 501 patients |
| 2026-06-10 | Prophet ML (`ml_engine.py`, `ML_USE_PROPHET`, Docker/CI `requirements-ml.txt`) | `test_ml_engine.py`, `test_ml_forecast.py` |
| 2026-06-12 | Dashboard ML enrichi : `generatedAt`, `model_version`, bande confiance, `MlForecastMeta`, i18n FR/EN/AR | `test_ml_forecast.py`, `tests/ml-format.test.ts` |
| 2026-06-16 | API `GET /api/ml/metrics` (MAE/MAPE holdout 7j) + `MlMetricsPanel` page prédiction | `test_ml_metrics.py`, `test_ml_engine.py` |
| 2026-06-16 | SMTP rappels RDV (`notification_channels`, MailHog Docker, `/admin/reminders/status`, bannière UI) | `test_notification_channels.py`, `test_health_details.py` |
| 2026-06-16 | MailHog activé (`backend/.env` SMTP) + UI pipeline admin (`PipelineAdminPanel` dans Paramètres) | manuel + `test_pipeline.py` |
| 2026-07-02 | Chatbot RAG complet (`chatbot_service`, widget H4H dans `AppLayout`, `/ui-config`, `/query-stream`) | `test_chatbot.py` (8), 68/68 pytest |
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

**Documents liés :** `README_00_Vision_Scope.md`, `README_FUTUR_IMPLEMENTATION.md`, `README_15_Gap_Analysis_Front_vs_Cahier.md`, `README_AIRFLOW_UTILISATION.md`, `README_01_Setup_Environnement.md`, `README_07_Data_Pipeline_Airflow.md`, `../README.md`.
