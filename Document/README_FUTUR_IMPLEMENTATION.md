# Plan d'implémentation — Futur

Objectif
 - Fournir une feuille de route concise et actionnable pour les améliorations RBAC, observabilité, tests et fonctionnalités avancées.

Comment utiliser ce fichier
 - Ce document liste les tâches prioritaires à implémenter dans les prochaines itérations.
 - Chaque tâche inclut une description courte, critère d'acceptation et priorités.
 - Mettre à jour l'état dans le tracker de tâches (TODO) et ajouter la date/nom de la personne qui a effectué le changement.

Priorités & tâches
1. Réconcilier permissions JWT
   - Description : S'assurer que le backend émet la revendication `permissions` dans le JWT OR fournir un mécanisme sécurisé côté frontend pour résoudre les permissions à partir des rôles (selon la politique choisie).
   - Critères d'acceptation : les guards frontend autorisent correctement les utilisateurs admins/managers sans faux positifs; tests unitaires vérifient la présence/lecture du claim.

2. Balayage 403 front-end
   - Description : Passer en revue toutes les pages et appels API côté client pour traiter proprement les réponses 401/403 (redirections, toasts, retry logique si refresh token).
   - Critères d'acceptation : UX cohérente pour accès refusé, logs d'autorisation centralisés.
   - **État :** [x] logs 403 backend + UX front (`handleAuthHttpError`, page `/403` i18n, exports blob).

3. Écrire tests E2E RBAC
   - Description : Ajouter scénarios E2E (playwright/cypress) qui valident parcours pour rôles : admin, manager, staff, médecin, patient.
   - Critères d'acceptation : scénarios CI exécutables, tests couvrant pages protégées et appels API.

4. UI gestion utilisateurs & permissions
   - Description : Construire une interface admin pour attribuer rôles et permissions aux utilisateurs (CRUD des rôles/permissions si nécessaire).
   - Critères d'acceptation : pouvoir assigner/revoquer permissions et voir audit d'historique.

5. Export analytics (PDF/Excel)
   - Description : Ajouter exportations pour tableaux de bord analytiques (PDF et Excel) avec filtres date/entité.
   - Critères d'acceptation : exports valides, tests manuels automatisés.

6. Observabilité et logs
   - Description : Ajouter corrélation d'ID, logs structurés pour refus d'accès, et métriques RBAC (taux 403, pages concernées).
   - Critères d'acceptation : traces retrouvables par corrId, dashboards de base (erreurs auth).

7. CI tests et déploiement
   - Description : S'assurer que les pipelines CI exécutent lint, tests unitaires, tests E2E et build frontend/backend.
   - Critères d'acceptation : pipeline vert sur PR, déploiement automatisé optionnel.

Acceptation générale
 - Chaque tâche doit avoir une PR associée avec description claire, issue liée, et tests unitaires/intégration quand applicable.

Mise à jour du suivi
 - Pour avancer une tâche, mettre à jour le tracker TODO (ou ce README) en indiquant la date, l'auteur et la référence PR/issue.

Contact & responsabilités
 - Garder une courte note (ligne) sur qui est responsable de l'implémentation dans la PR.

Notes finales
 - Ce fichier est un guide de priorité — ajuster en fonction des dépendances techniques et contraintes business.
