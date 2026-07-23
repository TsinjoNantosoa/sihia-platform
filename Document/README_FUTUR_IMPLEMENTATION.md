# SIH IA — Futures implémentations

> **Statut :** backlog produit (non implémenté, sauf mentions `[x]`)  
> **Objectif :** rendre la plateforme **plus intelligente** et **très utilisable** (clinique, ops, agent IA, prod).  
> **Stack cible :** `frontend/` (React) + `backend/` (FastAPI)  
> **Dernière mise à jour :** 23 juillet 2026

Ce document regroupe **toutes** les améliorations futures validables.  
Cocher `[x]` uniquement quand la feature est livrée **et** testée.  
Pour implémenter : valider un **pack** ou une liste de codes (`A1`, `G3`, `I1`…), puis avancer **une fonctionnalité à la fois**.

---

## Légende

| Symbole | Signification |
|---|---|
| `[ ]` | À faire (future) |
| `[x]` | Fait |
| 🟡 | Partiel / déjà amorcé |

---

## Comment utiliser

1. Choisir un **pack** (section Packs) ou une liste d’IDs.
2. Créer une issue / branche par item.
3. Mettre à jour ce fichier + `Document/README_ETAT_IMPLEMENTATION.md` à la livraison.
4. Critère général de fini : UI + API + tests (unit/API ou E2E) + i18n FR au minimum.

---

## Packs recommandés

| Pack | Contenu | Positionnement |
|---|---|---|
| **Lot 1 — Intelligent maintenant** | A1, A2, A6, A7, B2, B3 | IA visible + notifications utiles |
| **Lot 2 — Utilisable terrain** | B1, B5, B6, C1, C2, C6 | Quotidien hôpital |
| **Lot 3 — Décision & data** | A4, A5, E1, E2, E4 | Direction / managers |
| **Lot 4 — Scale & prod** | F1, F2, F3, F4, C9 | Vraie plateforme |
| **Lot 5 — Interop / futur** | C8, F6, F7, A10 | Différenciation long terme |
| **Brain Clinical** | G2, G3, G6, G7, K2 | Aide au médecin |
| **Brain Ops** | H1, H2, H4, H6, A2 | Hôpital optimisé |
| **Brain Agent** | I1, I2, I4, A6, A7 | Copilote SIH IA |
| **Brain Showcase** | K1, K3, K4, H7, I3 | Démo / portfolio wow |
| **Brain Full** | Clinical + Ops + Agent | Plateforme AI-first |

**Suggestion d’ordre réaliste :** Brain Agent → Brain Ops → Brain Showcase → Lots 2–4.

---

## A — Intelligence (IA / décision)

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| A1 | [ ] | Alertes proactives (seuil lit, no-show, surcharge) + actions suggérées | IA utile, pas seulement un graphique |
| A2 | [ ] | Prédiction no-show RDV + liste patients à rappeler | Gain opérationnel fort |
| A3 | [ ] | Recommandation de créneaux (meilleur horaire médecin/patient) | Prise de RDV intelligente |
| A4 | [ ] | Prophet / modèle ML par défaut (au-delà de la régression linéaire) | Prévisions plus crédibles |
| A5 | [ ] | Détection d’anomalies (admissions, revenus, occupation) | Dashboard qui “pense” |
| A6 | [ ] | Chatbot RAG enrichi (protocoles, FAQ, parcours) + sources citées | Assistant vraiment utile |
| A7 | [ ] | Résumé IA du dossier patient (historique → 5 lignes) | Gain de temps clinique |
| A8 | [ ] | Triage / priorisation file d’attente (urgence relative) | Intelligence opérationnelle |
| A9 | [ ] | Explainability (pourquoi cette prévision / alerte) | Confiance métier |
| A10 | [ ] | Feedback loop (valider/rejeter une reco → améliore le modèle) | IA qui apprend |

---

## B — Utilisabilité produit (UX quotidienne)

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| B1 | [ ] | Recherche globale ⌘K (patient / médecin / RDV / dossier) | Barre de recherche réellement utile |
| B2 | 🟡 | Notifications riches (clic → ouvrir RDV / patient / action) | Cloche branchée sur alertes ; actions deep-link à compléter |
| B3 | [ ] | Centre de notifications (lues/non lues, filtres, Settings branchés) | Inbox réelle |
| B4 | [ ] | Rappels RDV visibles dans l’UI (envoyé / échec / retry) | Backend partiel déjà présent |
| B5 | [ ] | Workflow confirmation RDV (planifié → confirmé → arrivé → terminé) | Parcours terrain |
| B6 | [ ] | Calendrier multi-médecins + drag & drop | Planning usable |
| B7 | [ ] | Filtres sauvegardés / vues “Mon service” | Moins de clics |
| B8 | [ ] | Mode offline / file d’attente si réseau faible | Contexte hôpital réel |
| B9 | [ ] | Onboarding + tooltips premier login | Adoption |
| B10 | [ ] | Accessibilité A11y (clavier, contrastes, lecteurs d’écran) | Qualité produit |
| B11 | [ ] | Tableaux densifiés (tri, colonnes, export par liste) | Productivité admin |
| B12 | [ ] | Toasts + undo sur actions critiques | Moins d’erreurs |

---

## C — Métier hospitalier

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| C1 | [ ] | Dossier patient enrichi (allergies, traitements, documents, assurance) | HIS réel |
| C2 | [ ] | Upload documents (ordonnance, radio, PDF) + visionneuse | Indispensable terrain |
| C3 | [ ] | Prescription / ordonnance (même simple) | Différenciant |
| C4 | [ ] | Hospitalisation / lits (affectation, entrée/sortie) | Occupancy réelle |
| C5 | [ ] | Facturation / paiements liés aux RDV | Analytics revenus crédibles |
| C6 | [ ] | File d’attente / salle d’attente (appel patient) | Utilisable le jour J |
| C7 | [ ] | Multi-établissements / multi-services | SaaS B2B |
| C8 | [ ] | HL7 / FHIR (interop labos / autres SI) | Vraie plateforme santé |
| C9 | [ ] | Consentement RGPD + journal d’accès dossier | Conformité santé |
| C10 | [ ] | Audit trail lisible (qui a vu / modifié quoi) | Confiance admin |

---

## D — Chatbot & assistant conversationnel

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| D1 | [ ] | Actions chatbot : créer RDV, trouver patient (avec confirmation) | Agent, pas FAQ |
| D2 | [ ] | Escalade humaine (ticket / standardiste) | Sécurité |
| D3 | [ ] | Mémoire de session + historique conversations | UX pro |
| D4 | [ ] | Disclaimer + modes (staff vs patient) | Cadre médical |
| D5 | [ ] | Multilingue AR plus naturel (terminologie médicale) | Marché MENA |

> Note : un chatbot RAG de base existe déjà (widget H4H). Les items D* sont des **extensions**.

---

## E — Données, BI & reporting

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| E1 | [ ] | BI avancée (cohortes, comparaison services, drill-down) | Analytics aujourd’hui partiel |
| E2 | [ ] | Rapports planifiés (email hebdo auto) | Utilisable sans ouvrir l’app |
| E3 | [ ] | Indicateurs de fraîcheur partout (dernière sync) | Confiance data |
| E4 | [ ] | Tableaux de bord par rôle (médecin ≠ admin ≠ staff) | Pertinence |
| E5 | [ ] | Benchmark (occupation vs cible hôpital) | Décision |

---

## F — Plateforme / prod / confiance

| ID | Statut | Fonctionnalité | Intérêt |
|---|---|---|---|
| F1 | [ ] | Déploiement cloud (staging + prod) | Utilisable hors localhost |
| F2 | [ ] | Vault / secrets + rotation | Sécurité |
| F3 | [ ] | ELK / monitoring (erreurs, perf, alertes ops) | Exploitation |
| F4 | [ ] | Fin checklist OWASP MVP | Prod santé |
| F5 | [ ] | Backup / restore DB documenté | Continuité |
| F6 | [ ] | App mobile (PWA ou native) pour médecins | Adoption |
| F7 | [ ] | SSO (Azure AD / Google Workspace hôpital) | Entreprises |

---

## G — IA clinique & aide à la décision

| ID | Statut | Fonctionnalité | Pourquoi “intello” |
|---|---|---|---|
| G1 | [ ] | Aide au diagnostic différentiel (symptômes → hypothèses + disclaimer) | Médecin assisté — jamais un diagnostic final |
| G2 | [ ] | Détection interactions médicamenteuses | Sécurité patient |
| G3 | [ ] | Score de risque (réadmission 30j, détérioration, chute) | Prédiction clinique |
| G4 | [ ] | Protocole clinique guidé (arbre + checklist IA) | Qualité des soins |
| G5 | [ ] | Lecture assistée ordo / CR (OCR + extraction structurée) | Moins de saisie |
| G6 | [ ] | Alertes “patient à risque” temps réel (dashboard médecin) | Anticipation |
| G7 | [ ] | Matching spécialiste (historique → meilleur médecin dispo) | Orientation intelligente |

---

## H — IA opérationnelle (hôpital qui s’optimise)

| ID | Statut | Fonctionnalité | Pourquoi “intello” |
|---|---|---|---|
| H1 | [ ] | Optimisation automatique des plannings (charge, congés, pics) | Staffing intelligent |
| H2 | [ ] | Prévision consommables / pharmacie (rupture anticipée) | Supply chain santé |
| H3 | [ ] | Routage intelligent des urgences (lits + spécialités + attente) | Flux patient |
| H4 | [ ] | Simulation “what-if” (ajouter 2 lits / 1 médecin) | Décision direction |
| H5 | [ ] | Détection fraude / abus (doublons, RDV fantômes) | Gouvernance |
| H6 | [ ] | Auto-priorisation file d’attente (gravité + délai) | Justice + efficacité |
| H7 | [ ] | Jumeau numérique du service (occupation + prévision 24h) | Smart hospital |

---

## I — Assistant agentique (agit, ne fait pas que répondre)

| ID | Statut | Fonctionnalité | Pourquoi “intello” |
|---|---|---|---|
| I1 | [ ] | Agent multi-étapes : “Prépare la matinée du Dr X” | Copilote |
| I2 | [ ] | Actions confirmées (créer RDV, rappel, ouvrir dossier) | Automatisation sûre |
| I3 | [ ] | Briefing vocal matinal (TTS résumé du service) | UX médecin |
| I4 | [ ] | Compte-rendu auto après consultation (brouillon à valider) | Gain de temps |
| I5 | [ ] | Traduction médicale live FR ↔ AR ↔ EN | Inclusion + MENA |
| I6 | [ ] | Veille interne : “Qu’est-ce qui a changé depuis hier ?” | Situation awareness |

---

## J — Données & apprentissage continu

| ID | Statut | Fonctionnalité | Pourquoi “intello” |
|---|---|---|---|
| J1 | [ ] | MLOps léger (versioning modèles, drift, retrain) | IA sérieuse |
| J2 | [ ] | A/B test des recommandations (ex. réduction no-shows) | Amélioration mesurée |
| J3 | [ ] | Knowledge graph patients–médecins–services–protocoles | RAG plus intelligent |
| J4 | [ ] | Anonymisation / synthetic data pour entraînement | Conformité + IA |
| J5 | [ ] | Benchmark inter-services anonymisé (multi-hôpitaux) | Intelligence collective |

---

## K — Expérience “wow” (démo / portfolio)

| ID | Statut | Fonctionnalité | Effet |
|---|---|---|---|
| K1 | [ ] | Carte chaleur occupation (lits / salles) animée | Démo visuelle |
| K2 | [ ] | Timeline patient IA (événements + risques + prochaines actions) | Dossier intelligent |
| K3 | [ ] | Mode “Command Center” (alertes + prévisions + chatbot) | Smart hospital feel |
| K4 | [ ] | Voice-to-action (“montre les patients critiques”) | Futuriste mais utile |
| K5 | [ ] | Notifications intelligentes (regroupées, priorisées, snooze) | Moins de bruit |

---

## Ancien backlog technique (suivi)

Items historiques du plan futur — à conserver pour traçabilité.

| # | Statut | Tâche | Notes |
|---|---|---|---|
| T1 | [ ] | Réconcilier permissions JWT (`permissions` claim vs mapping rôles) | Guards sans faux positifs |
| T2 | [x] | Balayage 403 front-end | `handleAuthHttpError`, page `/403` |
| T3 | [x] | Tests E2E RBAC (Playwright) | Voir `frontend/e2e/` |
| T4 | [x] | UI gestion users & rôles | CRUD RBAC admin |
| T5 | [x] | Export analytics PDF/Excel | API + UI |
| T6 | 🟡 | Observabilité (corr-id, logs, métriques) | Logs OK ; Vault / ELK → F2, F3 |
| T7 | 🟡 | CI lint/tests/build | CI OK ; déploiement auto → F1 |

---

## Règles d’implémentation

- **Sécurité santé :** toute aide clinique (G*, I4…) doit afficher un **disclaimer** et exiger une **validation humaine**.
- **Pas de diagnostic autonome** présenté comme vérité médicale.
- **RGPD :** pas de données patient réelles dans les captures / démos publiques.
- **Une PR = un ID** (ex. `feat(A2): no-show prediction`) autant que possible.
- Mettre à jour aussi `Document/README_ETAT_IMPLEMENTATION.md` à la livraison.

---

## Validation produit (à remplir)

| Date | Validé par | Pack / IDs choisis | Commentaire |
|---|---|---|---|
| _à compléter_ | | | |

Exemple :

```text
Validé : Brain Agent (I1, I2, I4, A6, A7) + B1
Ordre : A7 → I1 → I2 → B1
```

---

## Liens utiles

- État actuel : [`README_ETAT_IMPLEMENTATION.md`](./README_ETAT_IMPLEMENTATION.md)
- Gap analysis : [`README_15_Gap_Analysis_Front_vs_Cahier.md`](./README_15_Gap_Analysis_Front_vs_Cahier.md)
- README principal : [`../README.md`](../README.md)
- Structure code : `frontend/` · `backend/`
