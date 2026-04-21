# SIH IA — Frontend

**SIH IA** (Système Intelligent de Gestion Hospitalière) — SaaS B2B HealthTech.
Frontend complet en **React + TypeScript + TanStack Start + Vite + Tailwind CSS**.

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

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173 — tu seras redirigé vers `/login`.
Identifiants démo : **n'importe quel email + mot de passe**.

Astuce : utiliser un email contenant `admin`, `manager` ou `staff` pour changer le rôle.

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
- `GET/POST/DELETE /patients`
- `GET /doctors`
- `GET/POST /rendez-vous`
- `GET /analytics/*`
- `GET /ml/predict-7d`

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
