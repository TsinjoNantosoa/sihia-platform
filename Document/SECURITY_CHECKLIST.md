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
- [ ] Scan dépendances (`pip-audit`, `npm audit`) en CI

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
- [ ] Limite de tentatives login (rate limit)

## Headers HTTP

- [x] `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- [x] `Strict-Transport-Security` en production
- [x] `X-Correlation-ID` pour traçabilité

## Prochaines actions recommandées

1. Rate limiting sur `/api/auth/login`
2. PostgreSQL + chiffrement au repos
3. Audit logs des actions admin (CRUD users)
4. `pip-audit` / `npm audit` dans la pipeline CI
