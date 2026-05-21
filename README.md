# SIH IA - Plateforme hospitaliere intelligente

SIH IA est une plateforme web de gestion hospitaliere pour les equipes medicales et administratives. Le projet combine un frontend React moderne et un backend FastAPI, avec authentification JWT, RBAC, analytics, prediction IA et gestion des patients.

Le projet est deja operable en local et partiellement branche au backend. La base est solide pour une demo ou un pilote limite, mais certaines zones restent encore a durcir avant une mise en production complete.

## Etat du projet

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

### Encore a faire

- Supprimer totalement les dependances mock dans les parcours de production.
- Renforcer encore les parcours sensibles auth/RBAC.
- Ajouter des exports analytics plus complets, notamment PDF et Excel.
- Ajouter une vraie couche d’administration users / roles si besoin metier.
- Completer l’observabilite et les traces produits.
- Preparer le futur chatbot medical avec guardrails et disclaimer.

## Ce qui est deja implemente

### Frontend

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

- Endpoint login, refresh, logout et logout-all.
- Endpoints patients, history, doctors, appointments.
- Endpoints analytics, alerts, rbac users et prediction.
- Health checks simples et detailles.
- Gestion centralisee des erreurs HTTP et validation.
- Protection des routes metier par permissions.

### Securite et RBAC

- Les permissions sont derivees du JWT ou du role utilisateur.
- Les routes sensibles sont protegees par permission.
- Le frontend redirige vers `403` en cas d’acces refuse.
- Le backend emet des tokens de session refresh avec rotation.

### Donnees et comportement en local

- Le front peut utiliser des mocks uniquement en mode non-prod si `VITE_USE_MOCKS=true`.
- En fonctionnement normal, le front appelle le backend FastAPI.
- Le backend expose des donnees de demo coherentes pour permettre une navigation complete.

## Roadmap a suivre

Cette roadmap reprend la priorite logique a partir du code existant et du gap analysis.

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

## Roadmap detaillee par priorite

| Priorite | Objectif | Livraison attendue |
|---|---|---|
| P0 | Fiabiliser l’integration backend | Aucun parcours critique en mock sur l’environnement cible |
| P0 | Rendre RBAC effectif partout | Actions sensibles bloquees par role et permission |
| P1 | Completer analytics | Exports PDF / Excel et donnees mieux tracees |
| P1 | Etendre la prediction | Horizon 7j / 30j plus lisible et documente |
| P2 | Consolider patients | Historique medical et regles metier enrichies |
| P2 | Ameliorer observabilite | Logs, health et suivi d’erreurs exploitables |
| P3 | Preparer chatbot V2 | UI, guardrails et disclaimer medicaux |

## Architecture du projet

```text
src/
├── components/
│   ├── layout/        # Sidebar, Topbar, AppLayout
│   ├── shared/        # KpiCard, StatusBadge, States, PermissionGuard, etc.
│   └── ui/            # Composants UI de base
├── lib/
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

## Lancer le projet en local

### Frontend

```bash
npm install
npm run dev
```

Le front est disponible sur http://127.0.0.1:5173.

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Le backend est disponible sur http://127.0.0.1:8000.
La documentation Swagger est disponible sur http://127.0.0.1:8000/docs.

## Configuration

Copier le fichier d’exemple d’environnement si necessaire.

| Variable | Role |
|---|---|
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

Le projet est deja bien avance pour une demo et un pilote limite. Pour une mise en production sereine, la priorite doit rester la stabilisation de l’auth, du RBAC et de l’integration backend, avant d’attaquer les extensions futures.
