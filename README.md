# SIH IA — Plateforme (Frontend + Backend)

**SIH IA** (Système Intelligent de Gestion Hospitalière) — SaaS B2B HealthTech.

Plateforme complète avec :
- Frontend en **React + TypeScript + TanStack Start + Vite + Tailwind CSS**
- Backend en **FastAPI + SQLite + JWT**

## ✨ Fonctionnalités

- 🔐 **Login** mocké (n'importe quel email/mdp fonctionne)
- 📊 **Dashboard** : KPIs temps réel, prédiction de flux 7j, alertes critiques, prochains RDV
- 👤 **Patients** : liste paginée + filtres + recherche, détail, formulaire de création, suppression
- 🩺 **Médecins** : annuaire avec disponibilités, planning hebdo et statistiques
- 📅 **Rendez-vous** : vue liste + vue calendrier hebdomadaire, création avec **détection de conflits**
- 📈 **Analytique** : revenus, admissions, satisfaction, démographie (Recharts)
- 🧠 **Prédiction IA** : prévision LSTM 7 jours avec intervalle de confiance + recommandations
- 🛡 **RBAC** : utilisateurs, rôles, permissions
- ⚙️ **Paramètres** : profil, établissement, notifications, langue
- 🌍 **i18n FR / EN / AR** avec **mode RTL** automatique pour l'arabe
- 🎨 Design system **Calm Care** (tokens oklch, shadcn UI customisé)
- 🤖 **Chatbot médical** : widget flottant (streaming SSE, guardrails, RAG, FR/EN)

## 🚀 Démarrage

# SIH IA - Plateforme hospitaliere intelligente

### Frontend

SIH IA est une plateforme web de gestion hospitaliere pour les equipes medicales et administratives. Le projet combine un frontend React moderne et un backend FastAPI, avec authentification JWT, RBAC, analytics, prediction IA et gestion des patients.

```bash
npm install
npm run dev
```

Le projet est deja operable en local et partiellement branche au backend. La base est solide pour une demo ou un pilote limite, mais certaines zones restent encore a durcir avant une mise en production complete.

## Etat du projet

Ouvre http://localhost:8080 — tu seras redirigé vers `/login`.
Identifiants démo : `admin@sihia.health` / `admin123`, `dr.benali@sihia.health` / `demo1234`.

### Deja fait

- Frontend React + TypeScript avec TanStack Router, TanStack Query et Vite.
- Backend FastAPI structure en architecture propre avec couches application, domaine, infrastructure et presentation.
- Authentification JWT avec access token et refresh token.
- Refresh token rotation, logout courant et logout-all cote backend.
- RBAC avec permissions par role cote backend et guards cote frontend.
- Pages metier deja disponibles pour dashboard, patients, medecins, rendez-vous, analytics, prediction, RBAC et settings.
- Historique medical patient branche sur API reelle.
- Analytics avec KPIs, revenus, admissions et satisfaction.
- Prediction IA 7 jours et 30 jours avec metadonnees modele.
- Page 403 pour les acces interdits.
- i18n FR / EN / AR avec gestion RTL.
- Design system deja en place dans le front.
- Tests backend de securite auth deja ajoutes.
- Chatbot medical RAG (widget H4H, OpenAI streaming, guardrails, audit JSONL).

### Encore a faire

- Supprimer totalement les dependances mock dans les parcours de production.
- Renforcer encore les parcours sensibles auth/RBAC.
- Completer l'observabilite et les traces produits (vault, ELK).
- Deploiement cloud production.

## Ce qui est deja implemente

### Frontend

Astuce : utiliser un email contenant `admin`, `manager` ou `staff` pour changer le rôle.

- Login, redirection de session et protection des routes.
- Dashboard avec KPIs, alertes et prevision de flux.
- Liste, creation, suppression et detail des patients.
- Fiche patient avec historique medical.
- Annuaire medecins et vues metier associees.
- Rendez-vous avec creation et gestion de conflit.
- Analytics avec graphiques et export CSV.
- Prediction avec bascule entre horizon 7 jours et 30 jours.
- Ecrans RBAC et settings.
- Guards d’affichage sur certaines actions sensibles.

### Backend

```bash
cd backend
python -m venv venv.
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Endpoint login, refresh, logout et logout-all.
- Endpoints patients, history, doctors, appointments.
- Endpoints analytics, alerts, rbac users et prediction.
- Health checks simples et detailles.
- Gestion centralisee des erreurs HTTP et validation.
- Protection des routes metier par permissions.

Backend disponible sur `http://localhost:8000`
Swagger UI : `http://localhost:8000/docs`

### Securite et RBAC

## ⚙️ Configuration

- Les permissions sont derivees du JWT ou du role utilisateur.
- Les routes sensibles sont protegees par permission.
- Le frontend redirige vers `403` en cas d’acces refuse.
- Le backend emet des tokens de session refresh avec rotation.

Copier `.env.example` en `.env` :

### Donnees et comportement en local

```bash
cp .env.example .env
```

- Le front peut utiliser des mocks uniquement en mode non-prod si `VITE_USE_MOCKS=true`.
- En fonctionnement normal, le front appelle le backend FastAPI.
- Le backend expose des donnees de demo coherentes pour permettre une navigation complete.

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend FastAPI (vide = mocks) |
| `VITE_USE_MOCKS` | `true` pour utiliser les mocks intégrés |
| `VITE_CLIENT_ID` | Slug chatbot (`sihia` par défaut) |
| `VITE_CHATBOT_API_TOKEN` | Token chatbot (identique à `CHATBOT_API_TOKEN` backend) |

## Roadmap a suivre

## 📁 Architecture

Cette roadmap reprend la priorite logique a partir du code existant et du gap analysis.

```
### S1 - Stabilisation prod
1. Verrouiller le mode production pour eliminer les fallback mocks sur les parcours critiques.
2. Normaliser les reponses d’erreur backend et les messages frontend.
3. Renforcer l’auth avec une meilleure gestion d’expiration et de logout.
4. Securiser totalement les ecrans et actions RBAC sensibles.

### S2 - Valeur metier
1. Completer les exports analytics en PDF et Excel.
2. Industrialiser les vues de prediction avec plus de contexte modele.
3. Consolider les parcours patients avec davantage de regles metier.
4. Ajouter des indicateurs de fraicheur et de provenance des donnees.

### S3 - Qualite produit
1. Ajouter davantage de tests API et tests frontend sur les flux critiques.
2. Introduire l’observabilite applicative exploitable par l’equipe.
3. Ajouter des migrations versionnees si la base doit evoluer dans la duree.
4. Renforcer la conformite et la traçabilite des actions sensibles.

### V2 - Extension fonctionnelle
1. Preparer un chatbot medical avec disclaimer et escalation vers humain.
2. Ajouter des fonctions d’administration avancée des utilisateurs et permissions.
3. Ajouter des rappels metier automatiques pour les rendez-vous.
4. Etendre la partie BI et les analyses predictives.
```

## Roadmap detaillee par priorite

| Priorite | Objectif | Livraison attendue |
|---|---|---|
| P0 | Fiabiliser l’integration backend | Aucun parcours critique en mock sur l’environnement cible |
| P0 | Rendre RBAC effectif partout | Actions sensibles bloquees par role et permission |
| P1 | Completer analytics | Exports PDF / Excel et donnees mieux tracees |
| P1 | Etendre la prediction | Horizon 7j / 30j plus lisible et documente |
| P2 | Consolider patients | Historique medical et regles metier enrichies |
| P2 | Ameliorer observabilite | Logs, health et suivi d’erreurs exploitables |
| P3 | Deploiement cloud | Docker compose OK ; pas encore deploy prod |

## Architecture du projet

```text
src/
├── components/
│   ├── layout/        # Sidebar, Topbar, AppLayout
│   ├── shared/        # KpiCard, StatusBadge, States, ConfirmDialog…
│   └── ui/            # shadcn/ui
│   ├── shared/        # KpiCard, StatusBadge, States, PermissionGuard, etc.
│   └── ui/            # Composants UI de base
├── lib/
│   ├── api/
│   │   ├── services.ts   # 👈 Couche API centralisée (mock → FastAPI)
│   │   ├── mockData.ts   # Données réalistes
│   │   └── types.ts
│   ├── auth/store.ts     # Zustand auth (token, user, role)
│   └── i18n/
│       ├── dictionaries.ts # FR / EN / AR
│       └── store.ts        # Zustand + RTL auto
├── routes/
│   ├── __root.tsx
│   ├── login.tsx
│   ├── _app.tsx           # Layout protégé (auth guard)
│   └── _app/
│       ├── dashboard.tsx
│       ├── patients/[index, $patientId].tsx
│       ├── doctors.tsx
│       ├── appointments.tsx
│       ├── analytics.tsx
│       ├── prediction.tsx
│       ├── rbac.tsx
│       └── settings.tsx
└── styles.css         # Design tokens Calm Care (oklch)
│   ├── api/           # Services HTTP, types et mocks
│   ├── auth/          # Store auth, permissions, route guards
│   └── i18n/          # Dictionnaires et store de langue
├── routes/            # Routes TanStack Router
└── styles.css         # Styles globaux et design system

backend/app/
├── application/       # Cas d’usage et schemas
├── core/              # Configuration et securite
├── domain/            # Modeles et ports
├── infrastructure/    # Repositories et stockage
└── presentation/      # API HTTP et dependances
```

## 🔌 Brancher FastAPI

Tous les appels passent par `src/lib/api/services.ts`.
Pour migrer vers le vrai backend :

## Lancer le projet en local

```ts
// Avant (mock)
list: () => delay(PATIENTS),

### Frontend
// Après (FastAPI)
list: async () => {
	const r = await fetch(`${API_URL}/patients`, {
		headers: { Authorization: `Bearer ${useAuth.getState().token}` },
	});
	if (!r.ok) throw new Error("API error");
	return r.json();
},
```

```bash
npm install
npm run dev
```

Endpoints attendus côté FastAPI :
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET/POST/DELETE /patients`
- `GET/POST /patients/{id}/history`
- `GET /doctors`
- `GET/POST /rendez-vous`
- `GET /analytics/*`
- `GET /ml/predict-7d`
- `GET /ml/predict-30d`
- `GET /health/details`

Le front est disponible sur http://127.0.0.1:5173.

### Backend

## ✅ Travaux réalisés dans cette session

### Sécurité Auth / Session

- Passage à une auth JWT complète avec **access token + refresh token**
- Endpoint `POST /api/auth/refresh` implémenté
- **Rotation des refresh tokens** (un refresh token = usage unique)
- Stockage des sessions refresh en base SQLite (`refresh_sessions`)
- Révocation de session :
	- `POST /api/auth/logout` (appareil courant)
	- `POST /api/auth/logout-all` (tous les appareils)
- Limite du nombre de sessions actives par utilisateur (`max_refresh_sessions_per_user`)
- Mots de passe sécurisés en `pbkdf2_sha256` (+ migration auto des anciens mots de passe en clair)

### Persistance backend

- Remplacement des repositories in-memory par des repositories SQLite
- Création auto de la base (`backend/app.db`) et des tables
- Seed initial des utilisateurs et médecins
- Persistance durable des patients, rendez-vous, historique médical, sessions refresh

### RBAC et contrôle d'accès

- Vérification de permissions backend par route (`require_permission`)
- Protection des actions sensibles (ex: suppression patient, lecture RBAC users)
- Guards frontend sur navigation et actions (sidebar + boutons)

### Fonctionnel métier

- Historique médical patient branché sur API réelle (`GET/POST /patients/{id}/history`)
- Validation renforcée du formulaire patient
- Prédiction IA étendue 7j/30j avec métadonnées modèle
- Analytics avec filtre période (`3m/6m/12m`) et export CSV
- Page 403 dédiée pour accès refusé

### Observabilité et UX

- `GET /health/details` backend
- Indicateur de santé API dans la sidebar (ok/degraded/down)
- Toasts d’erreur réseau / serveur
- Confirmation avant "Déconnecter tous les appareils"

### Tests et validation

- Tests backend ajoutés dans `backend/tests/test_auth_security.py`
- Couverture tests auth:
	- hash + verify password
	- rotation refresh token
	- logout session
	- limite sessions actives
- Résultat actuel : **4 tests passés**

## 🛣️ Étapes suivantes recommandées

### Priorité P0 (production readiness)

- Ajouter une **gestion de secrets par environnement** (`JWT_SECRET` via `.env`, jamais hardcodé)
- Ajouter une **table users administrable** (CRUD users/roles côté RBAC)
- Implémenter **rate limiting** sur login/refresh (protection brute force)

### Priorité P1 (qualité et exploitation)

- Ajouter migrations versionnées (**Alembic**) au lieu de création implicite
- Ajouter suite de tests API FastAPI (patients, appointments, analytics)
- Ajouter tests frontend (auth flow, guards RBAC)

### Priorité P2 (fonctionnel métier)

- Export PDF analytics
- Edition planning médecins
- Rappels RDV automatiques (statut + historique en UI)
- Durcir la conformité RGPD (journal d’audit, masquage données sensibles)

## 🌍 Multilingue & RTL

Le store `useI18n` applique automatiquement `<html dir="rtl">` quand `locale=ar`.
Pour ajouter des clés : `src/lib/i18n/dictionaries.ts`.

Utilisation :

```tsx
const t = useT();
<h1>{t("dash.kpi.patients")}</h1>
```

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 📜 Scripts

Le backend est disponible sur http://127.0.0.1:8000.
La documentation Swagger est disponible sur http://127.0.0.1:8000/docs.

## Configuration

| Commande | Action |
|---|---|
| Copier le fichier d’exemple d’environnement si necessaire. |

| Variable | Role |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `VITE_API_URL` | URL du backend FastAPI |
| `VITE_USE_MOCKS` | Active les mocks front uniquement hors production |

## Comptes de demo

Le backend fournit des comptes de demo selon les donnees seedees.

- `dr.benali@sihia.health` / `demo1234`
- `admin@sihia.health` / `admin123`

## Endpoints principaux

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/patients`
- `GET /api/patients/{id}`
- `GET/POST /api/patients/{id}/history`
- `GET /api/doctors`
- `GET /api/appointments`
- `GET /api/analytics/kpis`
- `GET /api/analytics/revenue`
- `GET /api/analytics/admissions-dept`
- `GET /api/analytics/satisfaction`
- `GET /api/ml/predict-7d`
- `GET /api/ml/predict-30d`
- `GET /api/alerts`
- `GET /api/rbac/users`
- `GET /health`
- `GET /health/details`

## Tests et validation

Des tests backend existent deja pour les parcours de securite auth. La suite a renforcer en priorite concerne les flux patients, rendez-vous, analytics et RBAC.

## Note importante

---
© 2025 SIH IA — Frontend démo

Le projet est deja bien avance pour une demo et un pilote limite. Pour une mise en production sereine, la priorite doit rester la stabilisation de l’auth, du RBAC et de l’integration backend, avant d’attaquer les extensions futures.
