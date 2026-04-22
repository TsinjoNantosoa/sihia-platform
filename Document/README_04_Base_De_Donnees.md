# Base de donnees PostgreSQL

## Entites MVP
- users
- roles
- patients
- medecins
- rendez_vous
- audit_logs

## Regles cle
- UUID pour toutes les PK
- created_at et updated_at partout
- Contraintes d integrite (FK, unique)
- Index sur colonnes de recherche

## Migrations
1. Initial schema
2. Auth et roles
3. Patients
4. Medecins
5. Rendez-vous
6. Index et optimisations

## Politique de donnees sensibles
- Chiffrer les champs cliniques sensibles
- Eviter de stocker des donnees inutiles
- Tracer toute modification sensible

## Backup minimum
- Sauvegarde quotidienne
- Test de restauration chaque mois

## Definition of done data
- Schema migre sans erreur
- Requetes principales < 200 ms en local
- Plan d index documente
- Procedure de backup/restauration testee
