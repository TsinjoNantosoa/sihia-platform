# SIH IA — Checklist déploiement

> Dernière revue : 24 juillet 2026

## Verdict

| Niveau | Statut |
|---|---|
| Démo / POC / Upwork | ✅ Prêt |
| Pilote clinique limité | 🟡 OK avec Postgres + secrets forts |
| Production hôpital complète | 🔴 Pas encore (voir blocages) |

---

## Déjà opérationnel

- [x] Auth JWT + refresh + logout
- [x] Forgot password (code e-mail SMTP Gmail)
- [x] RBAC (rôles, guards, CRUD users)
- [x] Patients / Médecins / RDV / Analytics / Prédiction
- [x] Notifications cloche (alertes)
- [x] Chatbot RAG + rappels e-mail SMTP
- [x] Docker Compose + CI
- [x] Structure `frontend/` + `backend/`

---

## À faire AVANT deploy prod

### Obligatoire

1. **JWT_SECRET** fort (≥ 32 chars) — ne pas laisser `change-me-...`
2. **PostgreSQL** (`DATABASE_URL=postgresql+...`) — pas SQLite en prod
3. **CORS_ORIGINS** = URL réelle du front (https://ton-domaine.com)
4. **ENVIRONMENT=production**
5. **HTTPS** (reverse proxy / plateforme cloud)
6. Ne **jamais** committer `.env` (secrets SMTP / Google / OpenAI)

### Fortement recommandé

7. Backup Postgres automatique
8. `EMAIL_MODE=smtp` avec App Password Gmail (ou SendGrid)
9. Retirer / masquer données démo seed en prod
10. Monitoring basique (health `/health/details`)

---

## Connus / acceptables en démo

| Point | Note |
|---|---|
| Prédiction IA **BETA** | MAPE parfois hors cible — OK pour démo |
| Données seed / test | Patients / RDV fictifs |
| SMS | Mode journal local (pas Twilio) |
| OAuth Google | Variables prêtes, login OAuth pas encore branché UI |
| Vault / ELK | Futur (`README_FUTUR_IMPLEMENTATION.md`) |

---

## Commandes deploy typiques

```bash
# Build front
cd frontend && npm ci && npm run build

# Backend
cd backend
# .env prod : JWT_SECRET, DATABASE_URL, CORS_ORIGINS, EMAIL_MODE=smtp, SMTP_*
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\alembic upgrade head
.\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Ou `docker compose up -d` avec Postgres + backend + frontend.

---

## Compte admin déploiement local

- Email : `tsinjonantosoa@gmail.com`
- Rôle : admin  
- Mot de passe : celui défini localement (ne pas documenter en clair en prod)

---

## Liens

- Futur backlog : [`README_FUTUR_IMPLEMENTATION.md`](./README_FUTUR_IMPLEMENTATION.md)
- État code : [`README_ETAT_IMPLEMENTATION.md`](./README_ETAT_IMPLEMENTATION.md)
