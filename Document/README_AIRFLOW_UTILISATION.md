# Guide d'utilisation — Airflow & tests navigateur SIH IA

> **Public :** développeurs, testeurs, démo pilote  
> **Dernière mise à jour :** 10 juin 2026

Ce document regroupe **tous les accès**, **comptes utilisateurs** et **commandes** pour tester le pipeline Airflow et l'application SIH IA dans le navigateur.

---

## 1. URLs des services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend SIH IA** | http://localhost:8080/ | Application web (login, patients, RDV, analytics…) |
| **Login SIH IA** | http://localhost:8080/login | Page de connexion |
| **API Backend** | http://127.0.0.1:8000 | API REST FastAPI |
| **Swagger / docs API** | http://127.0.0.1:8000/docs | Documentation interactive |
| **Health simple** | http://127.0.0.1:8000/health | `{"status":"ok"}` |
| **Health détaillé** | http://127.0.0.1:8000/health/details | DB, ML, pipeline, métriques |
| **Airflow UI** | http://localhost:8081 | Orchestration des DAGs pipeline |
| **pgAdmin** (optionnel) | http://localhost:5050 | Administration PostgreSQL |

---

## 2. Comptes utilisateurs SIH IA (navigateur)

Ces comptes servent à se connecter sur **http://localhost:8080/login**.

| Rôle | Email | Mot de passe | Ce que tu peux tester |
|------|-------|--------------|------------------------|
| **Admin** | `admin@sihia.health` | `admin123` | Tout : RBAC, patients, RDV, analytics, ML, exports audit, pipeline API |
| **Médecin** | `dr.benali@sihia.health` | `demo1234` | Patients, RDV (créer/modifier), rappels RDV, analytics, ML |
| **Manager** | `manager@sihia.health` | `manager123` | Dashboard, analytics, lecture patients/RDV |
| **Staff accueil** | `staff@sihia.health` | `staff123` | Accueil : patients (lecture/création), RDV (lecture/création) — pas RBAC ni rappels |

### Permissions par rôle (résumé)

| Fonctionnalité | Admin | Médecin | Manager | Staff |
|----------------|:-----:|:-------:|:-------:|:-----:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Patients CRUD | ✅ | lecture/édition | lecture | lecture/création |
| Rendez-vous | ✅ | ✅ | lecture | création |
| Rappels RDV (bouton cloche) | ✅ | ✅ | ❌ | ❌ |
| Analytics / exports | ✅ | ✅ | ✅ | ❌ |
| Prédiction ML | ✅ | ✅ | ✅ | ❌ |
| RBAC (utilisateurs) | ✅ | ❌ | ❌ | ❌ |
| Pipeline API (status) | ✅ | ❌ | ✅ | ❌ |
| Pipeline API (lancer DAG) | ✅ | ✅ | ❌ | ❌ |

---

## 3. Compte Airflow (interface web)

Airflow tourne en mode **standalone** (développement). L'identifiant admin est **généré automatiquement** au premier démarrage du conteneur.

| Champ | Valeur |
|-------|--------|
| **URL** | http://localhost:8081 |
| **Utilisateur** | `admin` |
| **Mot de passe** | Voir ci-dessous (unique par conteneur) |

### Retrouver le mot de passe Airflow

```powershell
docker logs sihia-platform-airflow-1 2>&1 | findstr "Login with username"
```

Exemple de sortie :
```
standalone | Login with username: admin  password: 74a7E23WS4zQ9XdF
```

> Si le conteneur est **recréé** (`docker compose up --force-recreate`), un **nouveau** mot de passe est généré. Refaire la commande ci-dessus.

### pgAdmin (optionnel — base PostgreSQL)

| Champ | Valeur |
|-------|--------|
| URL | http://localhost:5050 |
| Email | `admin@sihia.health` |
| Mot de passe | `admin` |
| Serveur Postgres | host `postgres`, port `5432`, user/pass `sihia` / `sihia`, DB `sihia` |

---

## 4. Démarrer l'environnement complet

### 4.1 Prérequis

- Docker Desktop (pour Postgres + Airflow)
- Node.js LTS
- Python 3.11+ avec venv dans `backend/venv`

### 4.2 PostgreSQL + application (pilote)

```powershell
cd "C:\Users\HP 840 G8\Documents\projet\sihia-platform"

# Si le port 5434 est déjà pris sur ta machine :
$env:POSTGRES_PORT="5435"

# Postgres + migration + backend + frontend
npm run dev:pilot
```

Alternative (SQLite, sans Docker Postgres) :

```powershell
npm run dev:all
```

### 4.3 Airflow (en parallèle)

```powershell
cd "C:\Users\HP 840 G8\Documents\projet\sihia-platform"
$env:POSTGRES_PORT="5435"    # même port que Postgres SIH IA
npm run airflow:up
```

Attendre ~1–2 min, puis ouvrir http://localhost:8081 et se connecter avec `admin` + mot de passe des logs.

### 4.4 Vérifier que tout tourne

```powershell
# Postgres
docker ps --filter "name=sihia-platform-postgres"

# Airflow
docker ps --filter "name=sihia-platform-airflow"

# API
Invoke-RestMethod http://127.0.0.1:8000/health
```

---

## 5. DAGs Airflow disponibles

| DAG ID | Planning | Rôle |
|--------|----------|------|
| `patient_import` | Toutes les 6 h | Importe les CSV de `data/imports/*.csv` vers la table `patients` |
| `analytics_refresh` | Toutes les 1 h | Met à jour les snapshots KPI / revenus / alertes |
| `ml_features` | Toutes les 12 h | Alimente `ml_features_daily` (comptages RDV/jour) |
| `sihia_daily` | 05:00 chaque jour | Enchaîne les 3 pipelines ci-dessus |

### Fichier CSV d'import (exemple fourni)

`data/imports/patients_sample.csv` — 2 patients de démo (`IMP-001`, `IMP-002`).

Pour tester un nouvel import : ajouter un fichier `.csv` dans `data/imports/` avec les colonnes :

```
record_number,first_name,last_name,dob,gender,phone,email,address,blood_type,allergies,insurance,status
```

---

## 6. Commandes pipeline (sans ouvrir Airflow)

### 6.1 Scripts npm

```powershell
# Lancer un DAG précis
npm run pipeline:run -- patient_import
npm run pipeline:run -- analytics_refresh
npm run pipeline:run -- ml_features
npm run pipeline:run -- sihia_daily

# Démarrer Airflow Docker
npm run airflow:up
```

### 6.2 Scripts Python (depuis `backend/`)

```powershell
cd backend

# Exécution pipeline
.\venv\Scripts\python.exe scripts\run_pipeline.py patient_import
.\venv\Scripts\python.exe scripts\run_pipeline.py sihia_daily

# Vérification manuelle étapes 1 + 3 (CSV en base + API status)
.\venv\Scripts\python.exe scripts\test_pipeline_manual.py

# Test des callables DAG (sans conteneur Airflow)
.\venv\Scripts\python.exe scripts\test_airflow_dags.py

# Tests automatisés
.\venv\Scripts\python.exe -m pytest tests/test_pipeline.py -v
```

### 6.3 Commandes Docker Airflow

```powershell
# Lister les DAGs chargés
docker exec sihia-platform-airflow-1 airflow dags list

# Déclencher un DAG manuellement
docker exec sihia-platform-airflow-1 airflow dags trigger patient_import

# Tester une tâche (sans attendre le scheduler)
docker exec sihia-platform-airflow-1 airflow tasks test patient_import import_patients_csv 2026-06-10
docker exec sihia-platform-airflow-1 airflow tasks test analytics_refresh refresh_analytics_snapshots 2026-06-10
docker exec sihia-platform-airflow-1 airflow tasks test ml_features build_ml_features 2026-06-10

# Logs du conteneur (mot de passe admin, erreurs)
docker logs sihia-platform-airflow-1 --tail 50

# Arrêter Airflow
docker compose --profile airflow stop airflow

# Redémarrer (après modification docker-compose)
docker compose --profile airflow up -d airflow --force-recreate
```

---

## 7. API pipeline (navigateur ou Swagger)

Se connecter d'abord sur le frontend ou via Swagger (`/docs`) avec un compte **admin** ou **médecin** (pour lancer un DAG).

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| GET | `/api/admin/pipeline/status` | `analytics:read` | Derniers runs, alertes fraîcheur, snapshots |
| POST | `/api/admin/pipeline/run/{dag_id}` | `appointments:update` | Lance `patient_import`, `analytics_refresh`, `ml_features` ou `sihia_daily` |

### Exemple PowerShell (admin)

```powershell
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/login" -Method POST `
  -ContentType "application/json" -Body '{"email":"admin@sihia.health","password":"admin123"}'
$headers = @{ Authorization = "Bearer $($login.access_token)" }

# Statut pipeline
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/admin/pipeline/status" -Headers $headers

# Lancer import patients
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/admin/pipeline/run/patient_import" `
  -Method POST -Headers $headers
```

Dans **Swagger** : http://127.0.0.1:8000/docs → `Authorize` → coller le `access_token` → tester les routes `admin/pipeline`.

---

## 8. Scénario de test navigateur (pas à pas)

### A. Application SIH IA

1. Lancer `npm run dev:pilot` (ou `dev:all`).
2. Ouvrir http://localhost:8080/login.
3. Se connecter en **admin** (`admin@sihia.health` / `admin123`).
4. Vérifier :
   - **Dashboard** — KPIs chargés
   - **Patients** — liste (dont `IMP-001`, `IMP-002` si import fait)
   - **Rendez-vous** — colonne « Rappel », bouton cloche
   - **Analytique** — graphiques
   - **Prédiction** — courbes 7j/30j
   - **RBAC** — liste utilisateurs
5. Se déconnecter, reconnecter en **staff** — vérifier accès limité (pas d'analytics).
6. Ouvrir http://127.0.0.1:8000/health/details — vérifier `database.type`, `pipeline.freshness`.

### B. Airflow UI

1. Lancer `npm run airflow:up` (+ Postgres sur le même port).
2. Récupérer le mot de passe : `docker logs sihia-platform-airflow-1 2>&1 | findstr "Login with"`.
3. Ouvrir http://localhost:8081 → login `admin` + mot de passe.
4. Menu **DAGs** — tu dois voir les 4 DAGs (`patient_import`, `analytics_refresh`, `ml_features`, `sihia_daily`).
5. Cliquer sur `patient_import` → bouton **Trigger DAG** (icône play).
6. Onglet **Graph** ou **Grid** — attendre statut **success** (vert).
7. Vérifier côté SIH IA : nouveaux patients ou mise à jour dans la liste.

### C. Import CSV manuel

1. Copier/éditer `data/imports/patients_sample.csv` ou ajouter un nouveau `.csv`.
2. Lancer `npm run pipeline:run -- patient_import`.
3. Rafraîchir la page **Patients** dans le navigateur.

---

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| Port 5434 occupé | `$env:POSTGRES_PORT="5435"` avant `docker compose up` |
| Airflow ne démarre pas | Vérifier logs : `docker logs sihia-platform-airflow-1` |
| Mot de passe Airflow oublié | Recréer le conteneur ou relire les logs du premier démarrage |
| DAG en **failed** dans Airflow | `docker exec ... airflow tasks test <dag> <task> <date>` pour voir l'erreur |
| `relation pipeline_runs does not exist` | Relancer le backend (migrations Alembic 003) ou `npm run pilot:setup` |
| Frontend ne joint pas l'API | Vérifier backend sur :8000, CORS dans `backend/.env` |
| Import CSV 0 ligne | Vérifier que le fichier est dans `data/imports/` avec en-têtes correctes |

---

## 10. Fichiers utiles du projet

| Chemin | Rôle |
|--------|------|
| `airflow/dags/` | Définition des DAGs |
| `data/imports/` | CSV à importer par `patient_import` |
| `backend/scripts/run_pipeline.py` | CLI pipeline |
| `backend/scripts/test_pipeline_manual.py` | Vérif rapide CSV + API |
| `backend/scripts/test_airflow_dags.py` | Test callables DAG en local |
| `docker-compose.yml` | Services Postgres, Airflow (profile `airflow`) |
| `Document/README_07_Data_Pipeline_Airflow.md` | Spécification pipeline MVP |

---

## 11. Rappel sécurité

- Comptes et mots de passe ci-dessus sont **démo / développement uniquement**.
- Ne pas utiliser en production.
- Airflow standalone et mots de passe auto-générés ne sont pas adaptés à un déploiement réel.

---

**Documents liés :** [README_01_Setup_Environnement.md](./README_01_Setup_Environnement.md), [README_07_Data_Pipeline_Airflow.md](./README_07_Data_Pipeline_Airflow.md), [README_ETAT_IMPLEMENTATION.md](./README_ETAT_IMPLEMENTATION.md)
