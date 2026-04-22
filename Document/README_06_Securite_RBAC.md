# Securite et RBAC

## Priorites MVP
- Auth JWT robuste
- RBAC par role
- Chiffrement TLS en transit
- Audit log actions sensibles

## Roles minimum
- super_admin
- admin_hopital
- medecin
- staff
- patient

## Controles obligatoires
- Hash mot de passe fort
- Expiration access token courte
- Refresh token rotatif
- Rate limiting sur endpoints sensibles
- Validation stricte des entrees

## Checklist securite
- [ ] Secrets hors code source
- [ ] CORS limite aux domaines connus
- [ ] OWASP top 10 revue initiale
- [ ] Dependances scannees
- [ ] Audit trail actif

## Definition of done securite
- RBAC applique sur tous endpoints metier
- Test d acces interdit valide
- Aucun secret en clair dans repo
- Journal de securite consultable
