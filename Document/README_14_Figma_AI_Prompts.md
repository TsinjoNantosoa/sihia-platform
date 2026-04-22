# Prompts Lovable pour generer directement le frontend SIH IA

Ce document contient des prompts prets a coller dans Lovable pour qu il cree directement le frontend en code.

Objectif: obtenir une base front complete, propre et rapidement implementable pour votre projet SIH IA.

## 1) Prompt maitre Lovable (a utiliser en premier)
Copier-coller ce prompt tel quel dans Lovable:

Tu es un expert Frontend Engineer et Product Designer HealthTech.
Construis directement une application frontend complete pour un SaaS B2B nomme SIH IA (Systeme Intelligent de Gestion Hospitaliere).

Contexte:
- Cible: personnel d accueil, staff administratif, medecins, managers d hopital
- Objectif: gestion operationnelle hospitaliere + visualisation KPI + prediction flux patients
- Priorite: interface tres claire, rapide, fiable, facile pour utilisateurs non techniques

Stack frontend obligatoire:
- React + TypeScript
- Vite
- Tailwind CSS
- Composants UI reutilisables (style moderne premium)
- React Router
- React Query (ou equivalent) pour les donnees
- Etat global leger (Zustand ou Context)
- Architecture par modules

Ce que tu dois generer:
1. Structure complete du frontend
2. Routing principal
3. Layout app (sidebar, topbar, content)
4. Pages suivantes avec UI complete et etats:
  - Login
  - Dashboard
  - Patients (liste, detail, formulaire)
  - Medecins (liste, detail, disponibilites)
  - Rendez-vous (liste + calendrier)
  - Analytics
  - Prediction IA (prevision 7 jours)
  - Administration RBAC
  - Parametres
5. Composants reutilisables:
  - Table, filtres, recherche, pagination
  - Cards KPI
  - Form controls
  - Modal confirmation
  - Toast notifications
  - Badges statut
  - Empty state, loading state, error state
6. Service API frontend:
  - Crée un dossier services avec appels API centralises
  - Utilise des endpoints mockes realistes si backend absent
  - Prepare facilement le branchement futur avec FastAPI

Contraintes UX:
- Workflows critiques en 3 clics max
- Visibilite immediate des actions importantes
- Gestion claire des erreurs de formulaire
- Confirmations avant actions sensibles

Contraintes UI:
- Look moderne, propre, medical, professionnel
- Palette sante (bleu + vert + neutres)
- Contraste eleve, lisibilite forte
- Desktop prioritaire + responsive tablette/mobile

Accessibilite:
- WCAG AA minimum
- Focus visible clavier
- Labels explicites

Multilingue:
- Preparer i18n FR/EN/AR
- Prevoir mode RTL pour AR

Livrable attendu de Lovable:
- Projet frontend executable
- Code modulaire et lisible
- Donnees mock de demo realistes
- Navigation fonctionnelle de bout en bout
- README de lancement avec commandes

Important:
- Ne reste pas au niveau maquette.
- Genere le code frontend complet directement.
- Priorise la qualite de structure et la vitesse d implementation.

## 2) Prompt de refinement apres generation initiale
Copier-coller apres la premiere generation Lovable:

Ameliore le projet frontend SIH IA deja genere avec ces points:

1. Qualite code
- Factorise les composants repetes
- Ajoute types TypeScript stricts
- Simplifie la logique de state

2. UX metier
- Rendez-vous: ajoute gestion des conflits horaires plus visible
- Patients: ajoute filtres avances et recherche rapide
- Dashboard: priorise alertes critiques et actions rapides

3. Robustesse UI
- Ajoute tous les etats manquants: loading, empty, error, success
- Uniformise messages d erreur

4. i18n
- Ajoute dictionnaires FR/EN/AR
- Verifie comportement RTL sur sidebar, tableaux et formulaires

5. Dev readiness
- Ajoute fichier .env.example
- Centralise URL API
- Prepare couche auth token propre

## 3) Prompt pour brancher rapidement le backend FastAPI
Copier-coller quand vous voulez connecter le vrai backend:

Connecte le frontend SIH IA a un backend FastAPI.

Actions attendues:
- Remplacer mocks par appels API reels via services
- Gestions erreurs reseau standardisees
- Ajouter interceptors auth (token + refresh)
- Mapper ces ressources:
  - /auth
  - /patients
  - /medecins
  - /rendez-vous
  - /analytics
  - /ml/predict-7d
- Ajouter fallback UI si endpoint indisponible

Livrer:
- Front connecte API
- Message clair quand backend down
- Aucun crash UI sur erreurs API

## 4) Prompt court (version rapide)
Copier-coller si vous voulez aller vite:

Genere directement le code frontend complet d un SaaS HealthTech nomme SIH IA avec React TypeScript Vite Tailwind, pages Login Dashboard Patients Medecins Rendez-vous Analytics Prediction IA RBAC, layout pro sidebar/topbar, composants reutilisables, etats loading empty error, i18n FR EN AR avec RTL, mocks API realistes, architecture modulaire propre, et navigation fonctionnelle de bout en bout.

## 5) Conseils pour meilleur resultat dans Lovable
1. Lancer d abord le prompt maitre.
2. Lancer ensuite le prompt de refinement.
3. Demander une passe finale orientee performance et accessibilite.
4. Iterer page par page si une section est faible.
5. Garder les mocks jusqu a stabilisation UI, puis brancher FastAPI.
