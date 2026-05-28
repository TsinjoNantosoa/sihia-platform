# Checklist sécurité OWASP (MVP)

> Revue ciblée pour le pilote SIH IA — à compléter avant production.

## A01 — Contrôle d'accès

- [x] JWT + permissions par route (`require_permission`)
- [x] Guards frontend (routes + `PermissionGuard`)
- [x] RBAC CRUD réservé admin
- [ ] Revue périodique des comptes actifs

## A02 — Configuration

- [x] `JWT_SECRET` obligatoire en production (`config.py`)
- [x] `.env.example` documentés (racine + backend)
- [ ] Secrets injectés via vault / variables CI (pas dans git)

## A03 — Supply chain

- [x] CI : `pytest`, `eslint`, `build`, Playwright
- [x] Scan dépendances (`pip-audit`, `npm audit --omit=dev --audit-level=moderate`) en CI

## A04 — Cryptographie

- [x] Mots de passe hashés (bcrypt via `hash_password`)
- [x] Refresh tokens en session DB
- [ ] Rotation clés JWT planifiée

## A05 — Injection

- [x] Requêtes SQL paramétrées (SQLite)
- [x] Validation Pydantic sur entrées API

## A07 — Authentification

- [x] Login / refresh / logout / logout-all
- [x] Comptes suspendus refusés au login
- [x] Limite de tentatives login (rate limit, 5 échecs / 5 min / IP+email)

## A09 — Journalisation & monitoring

- [x] Audit logs actions admin (`create/update/delete user`, `logout-all`)
- [ ] Export centralisé des logs (ELK, Loki, Datadog…)

## Headers HTTP

- [x] `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- [x] `Strict-Transport-Security` en production
- [x] `X-Correlation-ID` pour traçabilité

## Prochaines actions recommandées

1. PostgreSQL + chiffrement au repos
2. Export centralisé + alerting sur logs d'audit
3. Suivi mensuel des dépendances (`npm outdated` + `npm audit fix`)
