# Strategie tests et QA

## Pyramide de tests
- Unit tests (services, validations)
- Integration tests (API + DB)
- E2E critiques (login, CRUD, RDV)

## Cas critiques a couvrir
- Auth correcte et refus acces
- Creation patient complete
- Prevention conflit de rendez-vous
- Export KPI sans erreur
- Migration DB reversible

## Objectifs qualite
- Couverture utile >= 70% sur modules critiques
- Zero bug critique ouvert avant demo pilote

## Checklist release
- [ ] Tests automatiques passes
- [ ] Migration appliquee en staging
- [ ] Smoke tests manuels OK
- [ ] Notes de release redigees

## Definition of done QA
- Scenario principal de bout en bout valide
- Aucune regression critique
- Rapport de tests archive
