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
- ♿ Focus visible, contrastes WCAG AA, labels explicites

## 🚀 Démarrage

### Frontend

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173 — tu seras redirigé vers `/login`.
Identifiants démo : **n'importe quel email + mot de passe**.

Astuce : utiliser un email contenant `admin`, `manager` ou `staff` pour changer le rôle.

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend disponible sur `http://localhost:8000`  
Swagger UI : `http://localhost:8000/docs`

## ⚙️ Configuration

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend FastAPI (vide = mocks) |
| `VITE_USE_MOCKS` | `true` pour utiliser les mocks intégrés |

## 📁 Architecture

```
src/
├── components/
│   ├── layout/        # Sidebar, Topbar, AppLayout
│   ├── shared/        # KpiCard, StatusBadge, States, ConfirmDialog…
│   └── ui/            # shadcn/ui
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
```

## 🔌 Brancher FastAPI

Tous les appels passent par `src/lib/api/services.ts`. Pour migrer vers le vrai backend :

```ts
// Avant (mock)
list: () => delay(PATIENTS),

// Après (FastAPI)
list: async () => {
  const r = await fetch(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${useAuth.getState().token}` },
  });
  if (!r.ok) throw new Error("API error");
  return r.json();
},
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
Pour ajouter des clés : `src/lib/i18n/dictionaries.ts`. Utilisation :

```tsx
const t = useT();
<h1>{t("dash.kpi.patients")}</h1>
```

## 📜 Scripts

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |

---
© 2025 SIH IA — Frontend démo
