# README_38 — Standards de code AI BOS

---

## Métadonnées du document

| Champ | Valeur |
|-------|--------|
| **Document** | README_38_CodingStandards.md |
| **Projet** | AI BOS — AI Business Operating System |
| **Version** | 0.1.0 |
| **Statut** | `REVIEW` — normatif pour toute contribution |
| **Audience** | Tous les développeurs, Reviewers |
| **Auteur** | AI BOS Engineering Standards Committee |
| **Dernière mise à jour** | Juillet 2026 |
| **Documents liés** | [README_37_DeveloperGuide](README_37_DeveloperGuide.md) · [README_06_ModularArchitecture](README_06_ModularArchitecture.md) · [README_39_ProjectStructure](README_39_ProjectStructure.md) |

---

## Table des matières

1. [Principes généraux](#1-principes-généraux)
2. [Standards Python](#2-standards-python)
3. [Standards TypeScript](#3-standards-typescript)
4. [Conventions de nommage](#4-conventions-de-nommage)
5. [Architecture & dépendances](#5-architecture--dépendances)
6. [API & contrats](#6-api--contrats)
7. [Tests](#7-tests)
8. [Sécurité code](#8-sécurité-code)
9. [Documentation code](#9-documentation-code)
10. [Checklist PR](#10-checklist-pr)
11. [Processus ADR](#11-processus-adr)
12. [Outils & configuration](#12-outils--configuration)

---

## 1. Principes généraux

### 1.1 Les dix commandements AI BOS

| # | Principe | Implication |
|---|----------|-------------|
| 1 | **Lisibilité > cleverness** | Code explicite, pas d'astuces obscures |
| 2 | **Minimal diff** | PR focalisée, pas de refactor opportuniste |
| 3 | **Tests avant merge** | Pas de code sans test sauf config/docs |
| 4 | **Types stricts** | mypy strict, TypeScript strict |
| 5 | **Pas de duplication** | Extraire vers CORE si réutilisable |
| 6 | **Domain pur** | Zéro import framework dans `domain/` |
| 7 | **Fail fast** | Validation entrée, erreurs typées |
| 8 | **Observable** | Logs structurés, correlation ID |
| 9 | **Secure by default** | RBAC chaque route, pas de secrets en code |
| 10 | **Conventions existantes** | Suivre le code environnant |

### 1.2 Héritage SIH IA

Les standards s'appuient sur les patterns validés dans `sihia-platform` :

- Clean Architecture 5 couches
- Erreurs HTTP `{ code, message, details }`
- Logs JSON via `log_event()`
- RBAC decorator `require_permission`

---

## 2. Standards Python

### 2.1 Version et tooling

| Outil | Configuration |
|-------|---------------|
| Python | 3.12+ |
| Formatter | **Ruff format** (remplace Black) |
| Linter | **Ruff check** |
| Type checker | **mypy** (strict progressive) |
| Import order | Ruff isort rules |
| Dependencies | `requirements.txt` + `pyproject.toml` |

### 2.2 Structure module

```python
# platform/identity/auth_service.py

"""Service d'authentification — use cases login/refresh/logout."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from platform.identity.domain.user import User
from platform.identity.ports import UserRepository

if TYPE_CHECKING:
    from platform.identity.schemas import LoginRequest

logger = logging.getLogger("ai-bos")


class AuthService:
    """Orchestre l'authentification JWT."""

    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def login(self, request: LoginRequest) -> TokenPair:
        ...
```

### 2.3 Règles Python

| Règle | Détail |
|-------|--------|
| **Annotations** | Toutes fonctions publiques typées |
| **`from __future__ import annotations`** | Fichiers avec forward refs |
| **Docstrings** | Modules et classes publiques (Google style) |
| **Async** | `async def` pour I/O ; sync pour CPU pur |
| **Exceptions** | Domain exceptions → HTTP dans presentation only |
| **Imports** | Absolus (`from platform.identity...`), pas relatifs profonds |
| **Constants** | `UPPER_SNAKE_CASE` module level |
| **Privé** | Préfixe `_` pour méthodes internes |
| **Dataclasses** | Domain entities ; Pydantic pour API schemas |

### 2.4 Pydantic schemas

```python
from pydantic import BaseModel, Field, ConfigDict

class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
```

| Convention | Valeur |
|------------|--------|
| Request schemas | `{Entity}Create`, `{Entity}Update` |
| Response schemas | `{Entity}Response`, `{Entity}ListResponse` |
| JSON API | **camelCase** via `alias_generator=to_camel` |
| Validation | Stricte — pas de `extra = "allow"` |

### 2.5 FastAPI routes

```python
@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sihia.patients.read")),
    service: PatientService = Depends(get_patient_service),
) -> PatientResponse:
    return await service.get_by_id(patient_id, current_user.organization_id)
```

| Règle | Détail |
|-------|--------|
| Logique métier | **Jamais** dans la route — déléguer au service |
| Permissions | `require_permission` sur chaque endpoint |
| Status codes | Explicites (`status_code=201` pour POST) |
| Tags OpenAPI | Par module (`tags=["sihia-patients"]`) |

### 2.6 SQLAlchemy

```python
class PatientModel(Base):
    __tablename__ = "sihia_patients"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("core_organizations.id"), index=True)
    first_name: Mapped[str] = mapped_column(String(100))
```

| Règle | Détail |
|-------|--------|
| Tables app | Préfixe `{slug}_` |
| Tables CORE | Préfixe `core_` |
| `organization_id` | **Obligatoire** toute table métier |
| Migrations | Alembic uniquement — jamais `create_all` prod |
| N+1 | `selectinload` / `joinedload` explicites |

---

## 3. Standards TypeScript

### 3.1 Version et tooling

| Outil | Configuration |
|-------|---------------|
| TypeScript | 5.8+ strict |
| Framework | React 19 |
| Build | Vite 7 |
| Router | TanStack Router |
| State serveur | TanStack Query |
| State client | Zustand |
| Linter | ESLint 9 flat config |
| Formatter | Prettier |

### 3.2 Structure composant

```tsx
// apps/sihia/components/PatientCard.tsx

import { type Patient } from '@ai-bos/api-client/types';
import { Card, CardHeader, CardTitle } from '@ai-bos/ui/card';
import { usePermission } from '@ai-bos/auth/usePermission';

interface PatientCardProps {
  patient: Patient;
  onEdit?: (id: string) => void;
}

export function PatientCard({ patient, onEdit }: PatientCardProps) {
  const canEdit = usePermission('sihia.patients.write');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{patient.firstName} {patient.lastName}</CardTitle>
      </CardHeader>
      {canEdit && onEdit && (
        <button type="button" onClick={() => onEdit(patient.id)}>
          Modifier
        </button>
      )}
    </Card>
  );
}
```

### 3.3 Règles TypeScript/React

| Règle | Détail |
|-------|--------|
| **`strict: true`** | Obligatoire — pas de `@ts-ignore` sans justification |
| **Composants** | Fonctions nommées (`function Foo()`, pas `const Foo = ()`) |
| **Props** | Interface `{Name}Props` |
| **Exports** | Named exports préférés |
| **Hooks** | Préfixe `use`, règles React respectées |
| **Imports** | Ordre : react → libs → `@ai-bos/*` → relatifs |
| **`any`** | Interdit sauf ADR |
| **Effets** | Minimiser `useEffect` — préférer Query |
| **Accessibilité** | Labels, roles ARIA, focus management |
| **i18n** | Pas de strings hardcodées UI — `useT()` |

### 3.4 TanStack Query

```tsx
export function usePatients(page: number) {
  return useQuery({
    queryKey: ['sihia', 'patients', page],
    queryFn: () => api.patients.list({ page }),
    staleTime: 30_000,
  });
}
```

| Règle | Détail |
|-------|--------|
| Query keys | `['app', 'resource', ...params]` |
| Mutations | `invalidateQueries` ciblées |
| Erreurs | Centraliser via `httpErrors.ts` |

### 3.5 CSS

| Règle | Détail |
|-------|--------|
| Framework | Tailwind CSS 4 |
| Composants | shadcn/ui dans `packages/ui` |
| Pas de CSS modules | Sauf exception justifiée |
| Tokens | Design tokens `packages/ui/tokens` |

---

## 4. Conventions de nommage

### 4.1 Backend Python

| Élément | Convention | Exemple |
|---------|------------|---------|
| Packages | `snake_case` | `platform/identity/` |
| Modules | `snake_case.py` | `auth_service.py` |
| Classes | `PascalCase` | `AuthService` |
| Functions | `snake_case` | `get_current_user` |
| Constants | `UPPER_SNAKE` | `MAX_PAGE_SIZE` |
| Tables DB | `snake_case` préfixé | `sihia_patients` |
| Permissions | `{slug}.{resource}.{action}` | `sihia.patients.read` |
| Events log | `dot.notation` | `auth.login.success` |

### 4.2 Frontend TypeScript

| Élément | Convention | Exemple |
|---------|------------|---------|
| Packages npm | `@ai-bos/{name}` | `@ai-bos/ui` |
| Composants | `PascalCase.tsx` | `PatientCard.tsx` |
| Hooks | `use{Name}.ts` | `usePatients.ts` |
| Utils | `camelCase.ts` | `formatDate.ts` |
| Types | `PascalCase` | `Patient`, `PatientCreate` |
| Routes | `kebab-case` fichiers | `patients/$patientId.tsx` |
| CSS variables | `--kebab-case` | `--color-primary` |

### 4.3 API REST

| Élément | Convention | Exemple |
|---------|------------|---------|
| Paths | `kebab-case` pluriel | `/api/v1/patients` |
| Query params | `camelCase` | `?startDate=2026-01-01` |
| JSON body | `camelCase` | `{ "firstName": "Jean" }` |
| Error codes | `SCREAMING_SNAKE` | `PATIENT_NOT_FOUND` |

### 4.4 Git

| Élément | Convention |
|---------|------------|
| Branches | `feature/sihia-patient-patch` |
| Commits | Conventional Commits |
| Tags | `v0.1.0` semver |

---

## 5. Architecture & dépendances

### 5.1 Règles import (enforced)

```
✅ apps/sihia → platform/*
✅ platform/identity → platform/config
✅ presentation → application → domain

❌ platform/* → apps/*
❌ apps/sihia → apps/eduai
❌ domain → fastapi, sqlalchemy, redis
❌ apps → platform/infrastructure (direct)
```

### 5.2 import-linter contracts

```ini
# pyproject.toml
[tool.importlinter]
contract_one = "platform -> apps : forbidden"
contract_two = "apps.sihia -> apps.eduai : forbidden"
contract_three = "domain -> infrastructure : forbidden"
```

### 5.3 Taille fichiers

| Type | Max recommandé |
|------|----------------|
| Service Python | 300 lignes |
| Route file | 200 lignes |
| Composant React | 250 lignes |
| Au-delà | Split obligatoire |

---

## 6. API & contrats

### 6.1 Format erreur standard

```json
{
  "code": "PATIENT_NOT_FOUND",
  "message": "Patient introuvable",
  "details": { "patientId": "uuid" }
}
```

Hérité SIH IA — **ne pas modifier** sans ADR.

### 6.2 Pagination

```json
{
  "items": [...],
  "page": 1,
  "pageSize": 20,
  "total": 150,
  "totalPages": 8
}
```

| Règle | Valeur |
|-------|--------|
| Default `pageSize` | 20 |
| Max `pageSize` | 100 |
| Tri | `?sortBy=createdAt&sortOrder=desc` |

### 6.3 Versionnement

- Préfixe `/api/v1/` obligatoire
- Breaking change → `/api/v2/`
- Dépréciation : header `Deprecation: true` + 6 mois overlap

---

## 7. Tests

### 7.1 Nommage

```python
# Python
def test_login_returns_tokens_for_valid_credentials(): ...
def test_login_returns_401_for_invalid_password(): ...
```

```typescript
// TypeScript
describe('PatientCard', () => {
  it('renders patient name', () => { ... });
  it('hides edit button without permission', () => { ... });
});
```

### 7.2 Structure pytest

```
tests/
├── conftest.py              # Fixtures globales
├── platform/
│   └── identity/
│       └── test_auth.py
└── apps/
    └── sihia/
        └── test_patients.py
```

### 7.3 Règles

| Règle | Détail |
|-------|--------|
| Couverture min | 70 % par module |
| Tests isolation | Tenant A ne voit pas données tenant B |
| Fixtures DB | Transaction rollback par test |
| Mocks | Interfaces (ports), pas implémentations |
| E2E | Parcours critiques Playwright |
| Pas de sleep | `await` ou polling avec timeout |

---

## 8. Sécurité code

### 8.1 Checklist sécurité

- [ ] Route protégée par auth + permission
- [ ] Input validé (Pydantic / Zod)
- [ ] `organization_id` filtré en DB
- [ ] Pas de SQL raw sans paramètres
- [ ] Pas de secrets dans code ou logs
- [ ] XSS : DOMPurify pour HTML user-generated
- [ ] CSRF : cookies `SameSite=Strict` si cookies
- [ ] Rate limiting endpoints sensibles

### 8.2 Données sensibles

| Donnée | Traitement |
|--------|------------|
| Mots de passe | bcrypt, jamais loggés |
| JWT | Logguer seulement `jti`, pas le token |
| PHI santé | `patient_id` only dans logs |
| API keys | Variables env, rotation 90 j |

---

## 9. Documentation code

### 9.1 Quand documenter

| Contexte | Requis |
|----------|--------|
| Module public CORE | Docstring module |
| Classe service | Docstring classe |
| API endpoint | OpenAPI description |
| Logique métier non évidente | Commentaire inline |
| Workaround | Commentaire + ticket Jira |

### 9.2 Quand NE PAS documenter

```python
# ❌ Mauvais — redondant
# Increment counter by 1
counter += 1

# ✅ Bon — explique le POURQUOI
# Pipeline freshness > 48h triggers degraded health (SLO MON-003)
if freshness_hours > 48:
    status = "degraded"
```

---

## 10. Checklist PR

### 10.1 Auteur — avant soumission

- [ ] Branche à jour avec `develop`
- [ ] `ruff check && ruff format` (backend)
- [ ] `pnpm lint && pnpm test` (frontend)
- [ ] `pytest` passe
- [ ] Pas de `console.log` / `print` debug
- [ ] Pas de fichiers `.env` committés
- [ ] Description PR complète + test plan
- [ ] Screenshots si changement UI
- [ ] ADR référencé si décision architecture

### 10.2 Reviewer

- [ ] Logique correcte et minimal scope
- [ ] Tests adéquats
- [ ] Respect boundaries modules
- [ ] Sécurité (auth, tenant isolation)
- [ ] Performance (N+1, pagination)
- [ ] Nommage conventions
- [ ] Pas de sur-engineering

### 10.3 Labels PR

| Label | Signification |
|-------|---------------|
| `size/XS-S-M-L-XL` | Taille diff |
| `type/feature` | Nouvelle fonctionnalité |
| `type/fix` | Correction bug |
| `needs-adr` | Décision architecture requise |
| `security` | Review sécurité additionnelle |
| `migration` | Extraction SIH IA |

---

## 11. Processus ADR

### 11.1 Quand créer un ADR

| Situation | ADR requis |
|-----------|------------|
| Nouvelle dépendance majeure | ✅ |
| Changement pattern architectural | ✅ |
| Breaking change API | ✅ |
| Choix base de données / queue | ✅ |
| Bug fix one-liner | ❌ |
| Refactor interne même API | ❌ |

### 11.2 Format ADR

```markdown
# ADR-XXX — Titre

## Statut
PROPOSED | APPROVED | DEPRECATED | SUPERSEDED

## Contexte
Quel problème résolvons-nous ?

## Décision
Que avons-nous décidé ?

## Conséquences
Positives et négatives.

## Alternatives considérées
| Option | Pour | Contre |
```

### 11.3 Emplacement et workflow

| Étape | Action |
|-------|--------|
| 1 | Créer `Document/adr/ADR-XXX-titre.md` |
| 2 | PR avec label `needs-adr` |
| 3 | Review Architecture Board |
| 4 | Statut `APPROVED` après merge |
| 5 | Référencer dans docs concernées |

### 11.4 ADRs existants (référence)

| ID | Titre | Doc source |
|----|-------|------------|
| ADR-001 | Monolithe modulaire | README_04 |
| ADR-MOD-003 | CORE cannot depend on Apps | README_06 |
| ADR-OBS-001 | Réutiliser logging SIH IA | README_32 |
| ADR-MIG-001 | Strangler Fig migration | README_35 |

---

## 12. Outils & configuration

### 12.1 Fichiers config racine

| Fichier | Rôle |
|---------|------|
| `pyproject.toml` | Ruff, mypy, import-linter |
| `frontend/eslint.config.js` | ESLint flat |
| `frontend/.prettierrc` | Prettier |
| `frontend/tsconfig.base.json` | TS strict shared |
| `.editorconfig` | Indentation universelle |
| `.pre-commit-config.yaml` | Hooks pre-commit |

### 12.2 Pre-commit hooks

```yaml
repos:
  - repo: local
    hooks:
      - id: ruff-check
        entry: ruff check
      - id: ruff-format
        entry: ruff format
      - id: eslint
        entry: pnpm lint
```

### 12.3 IDE settings recommandés

```json
{
  "editor.formatOnSave": true,
  "python.analysis.typeCheckingMode": "strict",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

*Standards évolutifs — propositions de changement via PR + revue Standards Committee trimestrielle.*
