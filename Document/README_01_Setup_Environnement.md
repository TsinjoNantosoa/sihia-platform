# Setup environnement — SIH IA

> Guide pour démarrer le **pilote local** (PostgreSQL + API + frontend).

## Prérequis

| Outil | Version |
|--------|---------|
| Git | récent |
| Docker Desktop | pour PostgreSQL (recommandé pilote) |
| Node.js | LTS (18+) |
| Python | 3.11+ |

## Démarrage rapide (pilote)

### 1. PostgreSQL (Docker)

```powershell
cd "C:\Users\HP 840 G8\Documents\projet\sihia-platform"
docker compose up -d postgres
# Si le port 5434 est déjà pris (autre conteneur Postgres) :
$env:POSTGRES_PORT="5435"; docker compose up -d postgres
```

| Paramètre | Valeur |
|-----------|--------|
| Host | `localhost` |
| Port hôte | **5434** par défaut (`POSTGRES_PORT` dans `.env` racine si occupé, ex. **5435**) |
| Base | `sihia` |
| User / mot de passe | `sihia` / `sihia` |

### 2. Configuration backend

Copier `backend/.env.example` → `backend/.env` :

```env
DATABASE_URL=postgresql+pg8000://sihia:sihia@localhost:5434/sihia
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080
```

> Sous **Windows**, préférer le driver **pg8000** (`postgresql+pg8000://…`) si `psycopg2` échoue. Adapter le port dans `DATABASE_URL` si vous utilisez `POSTGRES_PORT=5435`.

Migration des données SQLite → Postgres (une fois) :

```powershell
npm run pilot:setup
# ou uniquement la copie (Postgres déjà migré) :
npm run migrate:pg
```

### 3. Backend + frontend

```powershell
# Tout-en-un (recommandé)
npm run dev:all

# Ou : Postgres Docker puis app
npm run dev:pilot
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080/ |
| Login | http://localhost:8080/login |
| API | http://127.0.0.1:8000 |
| Health | http://127.0.0.1:8000/health |
| Health détaillé | http://127.0.0.1:8000/health/details |

### 4. Vérification pilote

`GET /health/details` doit indiquer :

- `components.database.type` = **`postgresql`**
- `components.database.status` = **`ok`**
- `config.database_url_scheme` = `postgresql+pg8000` (ou `postgresql`)

Comptes démo : `admin` / `admin123`, `dr.benali` / `demo1234`, `staff` / `staff123`.

### 5. pgAdmin (optionnel)

```powershell
docker compose up -d pgadmin
```

→ http://localhost:5050 — `admin@sihia.health` / `admin`

## Scripts npm utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Frontend seul (Vite, port 8080) |
| `npm run dev:all` | Backend + frontend |
| `npm run dev:pilot` | Postgres Docker + backend + frontend |
| `npm run migrate:pg` | Copie `app.db` → PostgreSQL |
| `npm run pipeline:run -- <dag>` | Lance un pipeline (ex. `patient_import`) |
| `npm run airflow:up` | Démarre Airflow sur http://localhost:8081 |
| `npm run test:e2e` | Tests Playwright |
| `npm run build` | Build production frontend |

## Tests backend

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v
```

## Variables d'environnement

| Variable | Fichier | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `backend/.env` | `app.db` (dev SQLite) ou URL Postgres |
| `JWT_SECRET` | `backend/.env` | Secret JWT (obligatoire en prod) |
| `CORS_ORIGINS` | `backend/.env` | Origines front autorisées |
| `VITE_API_URL` | `.env` racine | URL API (`http://127.0.0.1:8000`) |
| `CHATBOT_API_TOKEN` | `backend/.env` | Auth widget chatbot |
| `OPENAI_API_KEY` | `backend/.env` | LLM chatbot (streaming) |
| `VITE_CHATBOT_API_TOKEN` | `.env` racine | Même token que backend |

## Critères de validation (pilote S12)

- [x] `docker compose up -d postgres` → base accessible
- [x] `npm run dev:all` → front **8080** + API **8000**
- [x] `/health` → 200
- [x] `/health/details` → `postgresql` + métriques
- [x] Login UI fonctionnel
- [x] Widget chatbot visible après login (bulbe bas-droite)

## Arborescence

```
sihia-platform/
├── backend/          # FastAPI
├── src/              # React (Vite)
├── e2e/              # Playwright
├── Document/         # Documentation
└── docker-compose.yml
```

## Documents liés

- `README_ETAT_IMPLEMENTATION.md` — checklist et backlog
- `README.md` — index documentation
- `SECURITY_CHECKLIST.md` — sécurité MVP
