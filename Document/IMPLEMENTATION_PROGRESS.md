# Suivi d'implémentation autonome — SIH IA

> Dernière mise à jour : 2026-08-04

## Synthèse

| Champ | Valeur |
|---|---|
| **Statut session** | Thème clair/sombre + README production |
| **Prochaine** | C3 — Prescriptions |

---

## Terminées (rappel)

Lot 1 + Lot 2 (B1, C1/C2, C6) + **thème clair/sombre/système**.

### Docs production
- [`Document/README_PRODUCTION.md`](./README_PRODUCTION.md) — implémentations, checklist go-live, env, sécurité

---

## Terminées

| ID | Résumé |
|---|---|
| **A2** | `GET /api/ml/noshow-risk` + panneau Prédiction + rappels |
| **A1** | Alertes lits / surcharge / no-show + `suggestedActions` |
| **A6** | Chatbot RAG enrichi (protocoles, FAQ, parcours) + sources |
| **A7** | `POST /api/patients/{id}/ai-summary` + UI dossier |
| **B3** | Centre `/notifications` + prefs Settings (migration **006**) |
| **B1** | Recherche globale `Ctrl/⌘+K` + `GET /api/search` |
| **C1/C2** | Dossier enrichi + upload documents (migration **007**) |
| **C6** | Salle d'attente `/waiting-room` + appel suivant |

### Migrations
- `006_user_notifications.py`
- `007_patient_documents.py`

### Accès
- Front http://localhost:5174 · API http://127.0.0.1:8001/docs
- `/prediction#noshow` · `/notifications` · `/waiting-room` · `Ctrl+K`

### Tests exécutés (extraits)
- noshow, analytics/alertes, patient summary, chatbot, notifications, search, documents, waiting-room

---

## Suite backlog
C3 → C4 → C5 → C7–C10 → F1–F7 → packs G/H/I
