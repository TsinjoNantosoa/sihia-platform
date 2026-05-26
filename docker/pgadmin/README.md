# Connexion pgAdmin — SIH IA

## pgAdmin dans le navigateur (Docker, port 5050)

1. `docker compose up -d postgres pgadmin`
2. Ouvrir http://localhost:5050 — login `admin@sihia.health` / `admin`
3. Le serveur **SIH IA (PostgreSQL)** est préconfiguré (host interne `postgres`).

## pgAdmin 4 installé sur Windows (application locale)

Sur cette machine, **PostgreSQL Windows** utilise souvent le port **5432**.  
Le Postgres SIH IA (Docker) est exposé sur le port **5434**.

| Champ | Valeur |
|-------|--------|
| Host name | `localhost` |
| Port | **5434** |
| Maintenance database | `sihia` |
| Username | `sihia` |
| Password | `sihia` |

Après modification du port dans `docker-compose.yml`, recréer le conteneur :

```powershell
docker compose up -d postgres
```
