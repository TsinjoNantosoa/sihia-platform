# SIH IA Backend (Clean Architecture - SOLID)

Backend FastAPI structure pour `medisync-pulse`, organise en couches pour respecter SOLID:

- `domain/`: modeles metier et contrats (ports)
- `application/`: cas d'usage (orchestration metier)
- `infrastructure/`: adaptateurs techniques (repositories in-memory ici)
- `presentation/`: routes HTTP et dependances API
- `core/`: configuration et securite transverses

## Lancer le backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints exposes (S1/P0)

- `POST /api/auth/login`
- `GET/POST/DELETE /api/patients`
- `GET /api/patients/{id}`
- `GET /api/doctors`
- `GET/POST /api/appointments`
- `POST /api/appointments/{id}/cancel`
- `GET /api/analytics/kpis`
- `GET /api/analytics/revenue`
- `GET /api/analytics/admissions-dept`
- `GET /api/analytics/satisfaction`
- `GET /api/ml/predict-7d`
- `GET /api/alerts`
- `GET /api/rbac/users`

Tous les endpoints metier (hors login) exigent un `Authorization: Bearer <token>`.

## Comptes de demo

- `dr.benali@sihia.health` / `demo1234` (role doctor)
- `admin@sihia.health` / `admin123` (role admin)

## Migrations et données

En **développement**, `AUTO_RUN_MIGRATIONS=true` (défaut) applique Alembic au démarrage.

En **production**, définir `AUTO_RUN_MIGRATIONS=false` et exécuter avant le démarrage :

```bash
alembic upgrade head
```

Scripts one-shot :

```bash
python scripts/seed_demo.py
python scripts/migrate_legacy_passwords.py
```

Le forecasting ML consomme `ml_features_daily` lorsque le DAG `ml_features` a peuplé la table ; sinon fallback sur les RDV en base.

## Notes architecture

- Les use-cases dependent des ports `domain/ports.py`, pas des impl concretes.
- Les repositories in-memory sont remplacables par des impl SQLAlchemy sans changer les routes.
- Les erreurs metier sont centralisees au niveau application (`HTTPException` coherentes).

## Voice AI (mock / live)

`VOICE_PROVIDER_MODE=mock` (défaut) : simulateur dashboard, aucun appel téléphonique réel.

`VOICE_PROVIDER_MODE=live` : intégration ElevenLabs/Twilio. Les secrets restent dans l'ENV (`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `TWILIO_AUTH_TOKEN`, …). Sans credentials, l'API retourne `VOICE_PROVIDER_NOT_CONFIGURED` et ne simule pas un succès. L'outbound ElevenLabs n'est considéré configuré que si clé + agent + phone number id sont présents. Aucun appel PSTN n'est encore lancé.

Le comportement runtime (`agent_enabled`, inbound/outbound, confirmation, transcripts) se configure via `PATCH /api/voice/settings` (table `voice_settings`), pas via les secrets ENV.

Les webhooks `/webhooks/twilio/*` et `/webhooks/elevenlabs/*` n'utilisent pas le JWT utilisateur : validation de signature fournisseur en mode live / production.

`VOICE_PUBLIC_BASE_URL` (ex. `https://<service>.onrender.com`) est l'URL utilisée pour valider la signature Twilio derrière un reverse proxy. Ne pas désactiver la validation.

`VOICE_TIMEZONE` (défaut `UTC`, alias `APP_TIMEZONE`) s'applique aux quiet hours outbound. `silence_timeout_seconds` est conservé pour la future config ElevenLabs ; le silence audio n'est pas géré par FastAPI.

Gateway tools : `POST /webhooks/elevenlabs/tools/{tool_name}` authentifié par `ELEVENLABS_TOOL_SECRET` (pas de JWT humain). Les mutations utilisent le `VoiceExecutionContext` serveur.
