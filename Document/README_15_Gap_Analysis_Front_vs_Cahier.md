# Gap Analysis — Cahier des charges vs Front `medisync-pulse`

Document de synthese pour suivi implementation (version issue du canvas).

## Vue d'ensemble

- Modules analyses : 10
- Couverture fonctionnelle estimee : ~70%
- Pret demo : eleve
- Pret production : moyen-faible

Conclusion rapide : le front couvre bien la surface MVP, mais une partie critique reste en mode mock (auth fallback, analytics, prediction, alerts, RBAC). Priorite immediate : integration backend reelle + securisation des droits.

## Matrice de couverture

| Bloc cahier | Attendu | Etat front actuel | Niveau | Gap principal | Action recommandee |
|---|---|---|---|---|---|
| Auth + session | JWT reel, roles, securite | Login fonctionne, fallback mock actif si API indisponible | Partiel | Mode secours trop permissif pour prod | Activer mode strict prod, gestion refresh token, erreurs explicites |
| Patients | CRUD complet + recherche + dossier | Liste, filtre, creation, suppression, detail present | Bon | Historique medical avance non finalise | Ajouter sections historique, docs, assurances, validations metier |
| Medecins | Profils + planning + stats charge | Annuaire, disponibilite, mini planning, stats UI | Bon | Peu d'actions metier | Ajouter edition planning/vacations et vues charge detaillees |
| Rendez-vous | Prise RDV + calendrier + conflits + rappels | Liste/calendrier, creation, conflit 409 gere | Bon | Rappels automatiques non exposes | Ajouter etat rappels et statut notifications |
| Dashboard KPI | KPI temps reel + alertes + prochains RDV | UI complete et convaincante | Bon | Sources parfois mock | Brancher endpoints reels + timestamp de fraicheur |
| Analytique | Courbes revenus, occupation, tendances, exports | Graphiques presents | Partiel | Export PDF/Excel absent, data partiellement mock | Implementer export + filtres + provenance des donnees |
| Prediction IA | Prevision flux 7/30 jours + reco | Page prediction 7 jours avec confiance/reco | Partiel | 30 jours et observabilite modele absentes | Ajouter horizons 7/30, version modele, qualite et derive |
| RBAC | Controle fin par role sur ecrans/actions | Page roles/users presente, affichage surtout informatif | Partiel | Pas de guard fort sur actions sensibles | Introduire guards route + guards actions + tests d'autorisation |
| i18n + accessibilite | FR/EN/AR, RTL, UX inclusive | Bien implemente | Bon | Qualite traduction metier variable | Relecture terminologique medicale et tests RTL cibles |
| Chatbot medical | Assistant non diagnostique avec garde-fous | Module non visible dans ce front | Absent | Zero integration UI actuelle | Planifier widget chatbot en V2 avec disclaimer et escalade urgence |

## Backlog priorise (S1 a S3)

| Sprint | Priorite | Objectif | Effort | Dependances backend | Livrables concrets | Definition de fini |
|---|---|---|---|---|---|---|
| S1 | P0 | Fiabiliser l'integration backend | L | Spec endpoints, schemas erreurs, auth middleware | Contrats API stabilises, suppression fallback mock en prod, gestion erreurs standard | 0 endpoint critique en mock sur env cible |
| S1 | P0 | Rendre RBAC effectif | M | Claims role/permissions dans JWT + mapping permissions | Guards routes, guards boutons/actions, matrice role->permission | Actions interdites inaccessibles cote UI |
| S1 | P1 | Durcir auth | M | Refresh token endpoint, codes 401/403 harmonises | Gestion expiration token, logout propre, ecrans 401/403 coherents | Parcours auth testes bout en bout |
| S2 | P1 | Completer analytics | M | Endpoints agregats + export service PDF/Excel | Filtres periodiques, exports PDF/Excel, date de mise a jour | Exports fonctionnels et traces |
| S2 | P1 | Etendre prediction | M | Endpoint 30j, metadata modele, intervalle confiance | Vue 7/30 jours, score confiance, metadata modele | Comparaison horizons disponible |
| S2 | P2 | Consolider flux patients | L | Historique medical API, docs upload, regles validation | Historique medical enrichi, assurance/paiement, validations | Creation/consultation robuste sans saisie incoherente |
| S3 | P2 | Observabilite produit | S | Health endpoints, corr-id, logs frontend exploitables | Etats de sante API cote front, telemetry erreurs UX | Incidents detectables sans debug manuel |
| S3 | P3 | Preparation V2 chatbot | M | API conversation, politiques guardrails, parcours urgence | Spec UI widget, disclaimer legal, escalade urgence | Prototype integrable sans dette majeure |

## Ordre d'implementation recommande

| Etape | Pourquoi maintenant | Sortie attendue | Risque si reporte |
|---|---|---|---|
| 1. Contrat API + auth stricte | Debloque toutes les integrations sans dette mock | Flux login + data reel stable | Tests faux-positifs et regressions tardives |
| 2. RBAC executionnel | Condition de securite avant pilote reel | Actions sensibles verrouillees par role | Exposition de fonctions non autorisees |
| 3. Analytics + prediction reelles | Valeur business visible pour demo/pilote | KPI et previsions credibles | Perte de confiance metier |
| 4. Patients approfondi | Robustesse operationnelle quotidienne | Dossier patient plus complet | Blocages terrain sur cas reels |
| 5. Observabilite + chatbot prep | Prepare scale et V2 sans freiner MVP | Monitoring clair + spec chatbot propre | Dette technique et retard V2 |

## Decision guide

- Go demo investisseur : Oui, deja possible
- Go pilote clinique reel : Apres S1
- Go production securisee : Apres S2 minimum
