# SIH IA — Guide d’implémentation & préparation production

> **Date :** 4 août 2026  
> **Public :** équipe tech / DevOps / pilote clinique  
> **Objectif :** documenter ce qui est livré, comment le faire tourner, et ce qu’il reste pour une mise en production sécurisée.

Ce document complète :

- [`README.md`](../README.md) — démarrage rapide  
- [`Document/README_ETAT_IMPLEMENTATION.md`](./README_ETAT_IMPLEMENTATION.md) — checklist vivante  
- [`Document/README_FUTUR_IMPLEMENTATION.md`](./README_FUTUR_IMPLEMENTATION.md) — backlog  
- [`Document/IMPLEMENTATION_PROGRESS.md`](./IMPLEMENTATION_PROGRESS.md) — suivi session  
- [`Document/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) — OWASP MVP  

---

## 1. Synthèse produit

**SIH IA** est une plateforme HealthTech hospitalière (SaaS B2B) :

| Couche | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Router/Query, Tailwind 4, shadcn |
| Backend | FastAPI, SQLAlchemy, Alembic, JWT/RBAC |
| Données | SQLite (dev) / PostgreSQL (pilote & prod cible) |
| IA | Prévisions ML, no-show heuristique, résumé dossier, chatbot RAG |
| Ops | Docker Compose, CI GitHub Actions, Airflow (profile), MailHog (dev) |

**État :** MVP fonctionnel ~95 % en local / pilote. **Production cloud sécurisée : non encore atteinte** (voir §7).

---

## 2. Fonctionnalités livrées (implémentations)

### 2.1 Socle

- Auth JWT (access + refresh rotation), logout / logout-all, reset password  
- RBAC par permissions (`resource:action`) côté API + guards front  
- i18n **FR / EN / AR** + RTL  
- Accessibilité WCAG 2.1 AA (base)  
- **Thème clair / sombre / système** (classe `.dark`, persisté `localStorage`)  
- Health `/health`, `/health/details`, logs JSON, correlation-ID  

### 2.2 Métier hospitalier

| Module | Contenu |
|---|---|
| Patients | CRUD, historique médical, champs enrichis (chroniques, traitements, urgence), documents (upload PDF/image/txt) |
| Médecins | Annuaire + édition planning |
| RDV | Conflits, workflow, calendrier, offline queue, rappels email/SMS |
| Salle d’attente | `/waiting-room` — files du jour + « Appeler le suivant » |
| Dashboard / Analytics | KPIs SQL, exports PDF/Excel |
| RBAC admin | CRUD utilisateurs / rôles |
| Paramètres | Profil, langue, thème, prefs notifications, pipeline admin |

### 2.3 Intelligence (Lot 1)

| ID | Fonctionnalité |
|---|---|
| **A1** | Alertes proactives (occupation/lits, surcharge, no-show) + actions suggérées |
| **A2** | Score no-show + liste à rappeler (`GET /api/ml/noshow-risk`) |
| **A6** | Chatbot RAG enrichi (protocoles, FAQ, parcours) + sources citées |
| **A7** | Résumé IA dossier (`POST /api/patients/{id}/ai-summary`) — aide à la décision |
| **B3** | Centre de notifications (`/notifications`) + prefs persistées |

### 2.4 Utilisabilité (Lot 2 partiel)

| ID | Fonctionnalité |
|---|---|
| **B1** | Recherche globale `Ctrl/⌘+K` (`GET /api/search`) |
| **C1/C2** | Dossier enrichi + documents (migration `007`) |
| **C6** | File d’attente / salle d’attente |

### 2.5 Migrations Alembic concernées

| Rev | Contenu |
|---|---|
| `001`–`005` | Schéma initial, rappels, pipeline, reset password, last_login |
| **`006`** | Lectures notifications + préférences utilisateur |
| **`007`** | Documents patient + champs dossier enrichi |

---

## 3. Démarrage local (référence)

```bash
cd sihia-platform
npm run install:all
cd backend && python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
copy .env.example .env
cd ..\frontend && copy .env.example .env && cd ..

npm run dev:all
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5174 |
| API / Swagger | http://127.0.0.1:8001/docs |

Comptes démo : `admin@sihia.health` / `admin123` · `dr.benali@sihia.health` / `demo1234`

Pilote PostgreSQL : `npm run pilot:setup` puis `npm run dev:pilot`.

---

## 4. Thème clair / sombre

- Tokens CSS déjà définis dans `frontend/src/styles.css` (`:root` / `.dark`)  
- Store Zustand `frontend/src/lib/theme/store.ts` — modes : `light` | `dark` | `system`  
- Persistance : `localStorage` clé `sih-ia-theme`  
- Anti-FOUC : script bootstrap dans `__root.tsx`  
- UI : bouton soleil/lune dans la topbar + sélecteur dans **Paramètres → Thème**  

---

## 5. APIs ajoutées récemment (aperçu)

| Méthode | Endpoint | Permission |
|---|---|---|
| GET | `/api/ml/noshow-risk` | `ml:read` |
| POST | `/api/patients/{id}/ai-summary` | `patients:read` |
| GET/POST/DELETE | `/api/patients/{id}/documents…` | `patients:read` / `update` |
| GET/POST/PATCH | `/api/notifications…` | `dashboard:read` / `settings:read` |
| GET | `/api/search` | `dashboard:read` |
| GET/POST | `/api/waiting-room…` | `appointments:read` / `update` |

Swagger reste la source de vérité : http://127.0.0.1:8001/docs

---

## 6. Tests & qualité

```bash
npm run test:backend          # pytest
cd frontend && npm test       # vitest
npm run test:e2e              # Playwright (front + back)
npm run build                 # build front
```

Inclure notamment : noshow, alertes, résumé IA, chatbot, notifications, search, documents, waiting-room, thème.

---

## 7. Checklist « prêt production » (à valider)

### 7.1 Obligatoire avant go-live

| # | Item | Statut |
|---|---|---|
| P1 | Déploiement cloud staging + prod (HTTPS, domaines) | ⬜ F1 |
| P2 | Secrets hors repo : `JWT_SECRET` fort, Vault / secret manager | ⬜ F2 |
| P3 | PostgreSQL managé + backups automatiques documentés | ⬜ F5 |
| P4 | `CORS_ORIGINS` strict (pas de `*`) | ⬜ |
| P5 | SMTP/Twilio réels (plus mode `log`) pour rappels | ⬜ |
| P6 | Monitoring erreurs/perf (Sentry / ELK / équivalent) | ⬜ F3 |
| P7 | Fin checklist OWASP MVP + scans deps CI | 🟡 partiel |
| P8 | SSO hôpital (Azure AD / Google) si exigé | ⬜ F7 |
| P9 | Stockage documents hors disque local (S3/Azure Blob) + antivirus | ⬜ |
| P10 | RGPD : consentement, journal d’accès dossier, purge | ⬜ C9 |

### 7.2 Recommandé

- Rate limiting global (au-delà du login)  
- WAF / reverse proxy (nginx, Cloudflare)  
- Runbooks incident + RTO/RPO  
- Observabilité pipeline Airflow en prod  
- Prophet / OpenAI : clés optionnelles, fallbacks déjà en place  

### 7.3 Hors scope MVP (backlog)

Prescriptions (C3), lits (C4), facturation (C5), multi-établissements (C7), HL7/FHIR (C8), packs Brain G/H/I.

---

## 8. Variables d’environnement critiques (prod)

### Backend (`backend/.env`)

```env
JWT_SECRET=<32+ bytes aléatoires>
DATABASE_URL=postgresql+pg8000://...
CORS_ORIGINS=https://app.votredomaine.tld
EMAIL_MODE=smtp
SMTP_HOST=...
SMS_MODE=twilio   # ou log
OPENAI_API_KEY=   # optionnel chatbot / résumé
ML_USE_PROPHET=true
# Secret serveur uniquement (embeds). L'UI web utilise le JWT de session.
CHATBOT_API_TOKEN=<secret fort, jamais exposé au front>
```

### Frontend (`frontend/.env` / Vercel build)

```env
VITE_API_URL=https://api.votredomaine.tld
VITE_USE_MOCKS=false
VITE_CLIENT_ID=sihia
```

**Ne jamais** mettre de secret dans une variable `VITE_*` (embarqué dans le JS public).  
**Ne jamais committer** `.env`, clés API, dumps patients réels.

> **Rotation :** si un `VITE_CHATBOT_API_TOKEN` ou un token a été commités historiquement, régénérez `CHATBOT_API_TOKEN` côté backend.

---

## 9. Déploiement frontend sur Vercel

Le frontend est **TanStack Start (Vite) + Nitro**, pas Next.js. Un preset « Next.js » échoue avec `No Next.js version detected`.

### Configuration projet Vercel (dashboard) — recommandé

Pas de `vercel.json` dans le dépôt : tout se configure dans le dashboard.

| Réglage | Valeur |
|---|---|
| **Root Directory** | `frontend` |
| **Framework Preset** | **TanStack Start** (sinon **Other**) — **pas Vite**, pas Next.js |
| **Install / Build** | défaut (`npm run build`) — **pas** `--outDir dist` |
| **Output Directory** | **désactiver l’override** — Nitro écrit `.vercel/output` (Build Output API). Ne jamais forcer `dist` (sinon 404 NOT_FOUND) |
| **Node.js Version** | **22.x** |

[`frontend/vite.config.ts`](../frontend/vite.config.ts) enregistre le plugin Nitro (`preset: "vercel"` quand `VERCEL=1`).

### Variables d’environnement Vercel (Production + Preview)

| Variable | Exemple | Notes |
|---|---|---|
| `VITE_API_URL` | `https://api.votredomaine.tld` | URL HTTPS publique du backend FastAPI |
| `VITE_USE_MOCKS` | `false` | Ignoré en prod même si `true` |
| `VITE_CLIENT_ID` | `sihia` | Slug branding chatbot (non secret) |

Côté **backend** (hors Vercel) : `CORS_ORIGINS` doit inclure le domaine Vercel ; `CHATBOT_API_TOKEN` reste serveur-only.

### Rebuild local (vérif sortie Vercel)

```bash
cd frontend
# PowerShell
$env:NITRO_PRESET='vercel'
npm ci
npm run build
# doit produire .vercel/output/{config.json,static,functions}
```

---

## 10. Déploiement Docker (base)

```bash
docker compose up -d postgres
# configurer DATABASE_URL puis
docker compose up -d backend frontend
```

Voir aussi `Document/README_DEPLOY.md` et `Document/README_10_DevOps_Deploy.md`.

Pour la prod : images versionnées, healthchecks, rolling update, secrets injectés (pas dans l’image).

---

## 11. Sécurité clinique & IA

- Toute aide IA (résumé, chatbot, no-show) est une **aide à la décision**, pas un diagnostic.  
- Disclaimer affiché côté UI / réponses.  
- Données démo uniquement ; pas de données patients réelles dans captures / logs publics.  
- Uploads : types whitelistés, taille max 8 Mo — à compléter par stockage objet + scan en prod.

---

## 12. Prochaines étapes recommandées (ordre)

1. **F1** — Staging cloud + CI deploy  
2. **F2 / F5** — Secrets + backup/restore Postgres  
3. **F3 / F4** — Monitoring + hardening OWASP  
4. **C3** — Prescriptions  
5. **C9** — Consentement / audit accès dossier  

---

## 13. Contacts & docs

| Doc | Rôle |
|---|---|
| `Document/README_01_Setup_Environnement.md` | Setup détaillé |
| `Document/README_06_Securite_RBAC.md` | Sécurité / RBAC |
| `Document/README_AIRFLOW_UTILISATION.md` | Pipeline |
| `Document/SECURITY_CHECKLIST.md` | OWASP MVP |

---

*Document généré pour accompagner la mise en production progressive de SIH IA. Mettre à jour ce fichier à chaque livrable P* / F* coché.*
