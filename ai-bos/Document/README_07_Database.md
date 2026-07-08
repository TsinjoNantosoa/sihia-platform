# AI BOS — Base de données PostgreSQL

> **Version:** 0.1.0 | **Statut:** `DESIGN` | **Maturité:** `ALPHA`  
> **Dernière mise à jour:** Juillet 2026  
> **Audience:** Backend, DBA, Security, Architecture Review Board  
> **Référence héritage:** [SIH IA — Base de données](../../sihia-platform/Document/README_04_Base_De_Donnees.md)

---

## 1. Objectif et périmètre

Ce document définit la stratégie de persistance d'**AI BOS** : PostgreSQL comme source de vérité transactionnelle, isolation multi-tenant native, migrations versionnées, observabilité des données et conformité réglementaire (RGPD, SOC 2).

AI BOS hérite du pattern Alembic établi dans SIH IA (`backend/alembic/versions/001_initial_schema.py`, `002_appointment_reminders.py`, `003_pipeline_tables.py`) et l'étend pour une plateforme SaaS multi-organisation à l'échelle entreprise.

### Principes directeurs

| Principe | Description |
|----------|-------------|
| **PostgreSQL first** | Une seule base relationnelle mature ; pas de fragmentation prématurée |
| **Tenant isolation** | `organization_id` sur toutes les tables métier ; RLS en couche de défense |
| **Immutabilité des migrations** | Alembic linéaire ; jamais de modification rétroactive d'une migration déployée |
| **Auditabilité** | Toute mutation sensible tracée ; soft delete par défaut |
| **Évolutivité progressive** | Partitionnement et réplicas introduits sous contrainte mesurée |

---

## 2. Architecture logique

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer (FastAPI)                  │
│  Session context: organization_id, user_id, correlation_id     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Connection Pool (PgBouncer / RDS Proxy)             │
│  Mode: transaction pooling pour requêtes courtes                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐  ┌───────▼───────┐
│   Primary     │   │  Read Replica 1 │  │ Read Replica N│
│  (writes +    │   │  (analytics,    │  │  (reporting)  │
│   critical    │   │   search index) │  │               │
│   reads)      │   │                 │  │               │
└───────────────┘   └─────────────────┘  └───────────────┘
```

### Schémas PostgreSQL

| Schéma | Rôle | Exemples de tables |
|--------|------|-------------------|
| `core` | Identité, organisations, billing | `organizations`, `users`, `memberships` |
| `auth` | Sessions, tokens, MFA | `refresh_tokens`, `mfa_devices` |
| `rbac` | Rôles et permissions | `roles`, `permissions`, `role_assignments` |
| `audit` | Journal immuable | `audit_events`, `data_access_log` |
| `ai` | Conversations, prompts, coûts | `conversations`, `llm_calls`, `prompt_versions` |
| `kb` | Base de connaissances RAG | `documents`, `chunks`, `embeddings` |
| `workflow` | Automatisations | `workflows`, `workflow_runs`, `workflow_steps` |
| `agent` | Agents métier | `agents`, `agent_memories`, `agent_tool_calls` |
| `app_*` | Modules verticaux (plugin) | `app_sihia.patients`, `app_retail.orders` |

Chaque schéma applicatif vertical (`app_sihia`, `app_legal`, etc.) reste isolé tout en partageant les conventions CORE.

---

## 3. Modèle multi-tenant

### ADR-007-001 : Colonne `organization_id` obligatoire

Toute table contenant des données métier ou utilisateur **doit** inclure :

```sql
organization_id UUID NOT NULL REFERENCES core.organizations(id)
```

**Exceptions explicites :**
- Tables de référence globale (`core.countries`, `core.currencies`)
- Tables d'audit cross-tenant (accès restreint au rôle `platform_admin`)
- Tables de configuration plateforme (`core.feature_flags`)

### Index composite obligatoire

```sql
CREATE INDEX idx_{table}_org_id ON {schema}.{table} (organization_id);
CREATE INDEX idx_{table}_org_created ON {schema}.{table} (organization_id, created_at DESC);
```

Pour les recherches fréquentes par tenant + statut :

```sql
CREATE INDEX idx_{table}_org_status ON {schema}.{table} (organization_id, status)
  WHERE deleted_at IS NULL;
```

### Hiérarchie organisationnelle

```
Platform (AI BOS)
└── Organization (tenant facturable)
    ├── Workspace (optionnel — division métier)
    │   └── Team
    └── User (via membership)
```

Le `organization_id` est injecté au niveau middleware FastAPI et propagé dans le contexte SQLAlchemy via `SET LOCAL app.current_organization_id`.

---

## 4. Row-Level Security (RLS)

### ADR-007-002 : RLS comme défense en profondeur

L'application filtre toujours par `organization_id` dans ses requêtes ORM. Le RLS PostgreSQL constitue une **seconde barrière** contre les fuites de données en cas de bug applicatif.

```sql
-- Activation sur chaque table tenant-scoped
ALTER TABLE kb.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.documents FORCE ROW LEVEL SECURITY;

-- Politique standard lecture/écriture
CREATE POLICY tenant_isolation_select ON kb.documents
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY tenant_isolation_insert ON kb.documents
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY tenant_isolation_update ON kb.documents
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY tenant_isolation_delete ON kb.documents
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### Rôle `platform_admin`

Politique distincte pour les opérations de support (accès journalisé, MFA obligatoire, durée limitée) :

```sql
CREATE POLICY platform_admin_bypass ON kb.documents
  FOR ALL
  TO platform_admin_role
  USING (true)
  WITH CHECK (true);
```

Tout accès via ce rôle génère un événement `audit.data_access` avec justification obligatoire.

### Tests RLS

Chaque migration activant RLS doit être accompagnée d'un test d'intégration vérifiant :
1. Un tenant A ne peut pas lire les données du tenant B
2. Une requête sans `SET LOCAL` échoue (zéro ligne ou erreur)
3. Le bypass `platform_admin` est tracé

---

## 5. Migrations Alembic

### Pattern hérité SIH IA

SIH IA utilise une chaîne linéaire de révisions :

```
001_initial_schema → 002_appointment_reminders → 003_pipeline_tables → ...
```

AI BOS conserve ce modèle dans `core/database/alembic/` avec les extensions suivantes.

### Conventions de nommage

```
{NNN}_{description_courte}.py

Exemples :
004_core_organizations.py
005_auth_refresh_tokens.py
006_kb_documents_chunks.py
007_ai_conversations.py
```

### Structure d'une migration type

```python
"""Ajout table documents KB avec RLS.

Revision ID: 006
Revises: 005
Create Date: 2026-07-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"

def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS kb")
    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema="kb",
    )
    op.create_index("idx_documents_org_id", "documents", ["organization_id"], schema="kb")
    # RLS policies via op.execute(...)

def downgrade() -> None:
    op.drop_table("documents", schema="kb")
```

### Règles de gouvernance

| Règle | Détail |
|-------|--------|
| **Une migration = un changement atomique** | Pas de mélange schéma + données de seed massives |
| **Downgrade obligatoire** | Même si rarement utilisé en production |
| **Review DBA** | Migrations > 10 000 lignes ou touchant RLS |
| **Zero-downtime** | Ajout colonne nullable → backfill → NOT NULL en migration séparée |
| **CI** | `alembic upgrade head` + `alembic downgrade -1` sur chaque PR |

### Environnements

```bash
# Développement local
alembic -c core/database/alembic.ini upgrade head

# Staging / Production — via pipeline CI/CD uniquement
# Jamais de migration manuelle sans ticket change management
```

---

## 6. Types de données et conventions

### Identifiants

| Type | Usage |
|------|-------|
| `UUID v4` | Toutes les clés primaires (`gen_random_uuid()`) |
| `TEXT` | Chaînes courtes et longues (pas de VARCHAR arbitraire) |
| `TIMESTAMPTZ` | Tous les horodatages (UTC stocké, conversion côté client) |
| `JSONB` | Métadonnées flexibles, configurations agent |
| `VECTOR(n)` | Embeddings pgvector (dimension selon modèle) |

### Colonnes standard sur toutes les tables métier

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID NOT NULL REFERENCES core.organizations(id),
created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
created_by      UUID REFERENCES core.users(id),
updated_by      UUID REFERENCES core.users(id),
deleted_at      TIMESTAMPTZ,          -- soft delete
deleted_by      UUID REFERENCES core.users(id),
version         INTEGER NOT NULL DEFAULT 1  -- optimistic locking
```

### Trigger `updated_at` automatique

```sql
CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Read replicas

### ADR-007-003 : Séparation lecture/écriture progressive

| Phase | Configuration |
|-------|---------------|
| **Alpha** | Primary unique (développement, premiers clients) |
| **Beta** | 1 read replica (reporting, analytics dashboards) |
| **GA** | 2+ replicas avec routing applicatif |

### Routing applicatif

```python
# core/database/session.py
class DatabaseRouter:
    def get_session(self, *, read_only: bool = False) -> AsyncSession:
        if read_only and settings.read_replica_url:
            return self._replica_session_factory()
        return self._primary_session_factory()
```

**Requêtes autorisées sur replica :**
- Dashboards analytics et BI
- Export de rapports
- Recherche full-text non critique (< 30 s de lag acceptable)
- Pré-calcul d'agrégats

**Requêtes interdites sur replica :**
- Toute écriture
- Lecture après écriture immédiate (read-your-writes)
- Transactions impliquant RLS avec contexte fraîchement modifié
- Vérification d'unicité avant insert

### Monitoring replication lag

Alerte si `pg_stat_replication.replay_lag` > 5 secondes (warning) ou > 30 secondes (critical).

---

## 8. Stratégie de partitionnement

### ADR-007-004 : Partitionnement par date sur tables à fort volume

Tables candidates au partitionnement (seuils indicatifs) :

| Table | Seuil | Stratégie |
|-------|-------|-----------|
| `audit.audit_events` | > 50 M lignes | RANGE par mois (`created_at`) |
| `ai.llm_calls` | > 10 M lignes | RANGE par mois |
| `ai.conversation_messages` | > 20 M lignes | RANGE par trimestre |
| `workflow.workflow_step_logs` | > 30 M lignes | RANGE par mois |
| `kb.embeddings` | > 100 M vecteurs | HASH par `organization_id` (optionnel) |

### Exemple : partitionnement mensuel audit

```sql
CREATE TABLE audit.audit_events (
    id UUID NOT NULL,
    organization_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit.audit_events_2026_07
    PARTITION OF audit.audit_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### Gestion du cycle de vie des partitions

1. **Création proactive** : job mensuel crée la partition N+2
2. **Détachement** : partition > rétention détachée (`DETACH PARTITION`)
3. **Archivage** : export vers S3 Glacier (format Parquet)
4. **Suppression** : `DROP TABLE` après période légale

---

## 9. Vector store : pgvector vs Pinecone

### ADR-007-005 : pgvector par défaut, Pinecone en option premium

| Critère | pgvector (PostgreSQL) | Pinecone (SaaS) |
|---------|----------------------|-----------------|
| **Cohérence transactionnelle** | ACID avec documents KB | Eventual consistency |
| **Isolation tenant** | RLS natif | Namespace par org |
| **Coût opérationnel** | Inclus dans PostgreSQL | Facturation séparée |
| **Performance > 10 M vecteurs** | Nécessite tuning (HNSW, RAM) | Optimisé out-of-the-box |
| **Hybrid search** | SQL + tsvector + pgvector | Intégré |
| **Vendor lock-in** | Faible | Moyen |

### Recommandation par phase

```
Phase 1 (MVP)     → pgvector extension, index HNSW
Phase 2 (Scale)   → pgvector + read replica dédié embeddings
Phase 3 (Premium) → Pinecone pour tenants Enterprise > 5 M chunks
```

### Schéma pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    chunk_id UUID NOT NULL REFERENCES kb.chunks(id),
    model TEXT NOT NULL,           -- ex: text-embedding-3-small
    dimensions INTEGER NOT NULL,   -- ex: 1536
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_hnsw ON kb.embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index partiel par tenant pour requêtes fréquentes
CREATE INDEX idx_embeddings_org ON kb.embeddings (organization_id);
```

### Requête de similarité avec isolation tenant

```sql
SELECT c.content, e.embedding <=> $query_vector AS distance
FROM kb.embeddings e
JOIN kb.chunks c ON c.id = e.chunk_id
WHERE e.organization_id = $org_id
  AND c.deleted_at IS NULL
ORDER BY e.embedding <=> $query_vector
LIMIT 10;
```

---

## 10. Tables d'audit

### Modèle d'événements

Héritage du pattern audit JSONL SIH IA, migré vers PostgreSQL structuré :

```sql
CREATE TABLE audit.audit_events (
    id UUID NOT NULL,
    organization_id UUID,          -- NULL pour événements plateforme
    actor_id UUID,                   -- utilisateur ou agent
    actor_type TEXT NOT NULL,        -- user | agent | system | api_key
    event_type TEXT NOT NULL,        -- ex: document.created, llm.call
    resource_type TEXT,
    resource_id UUID,
    action TEXT NOT NULL,            -- create | read | update | delete | execute
    payload JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

### Événements obligatoires

| Domaine | Événements tracés |
|---------|-------------------|
| **Identité** | login, logout, mfa_challenge, password_reset |
| **Autorisation** | permission_denied, role_assigned |
| **Données** | create, update, delete, export, bulk_read |
| **IA** | llm_request, guardrail_triggered, rag_retrieval |
| **Agents** | tool_call, agent_handoff, workflow_trigger |
| **Admin** | platform_admin_access, tenant_impersonation |

### Immutabilité

- Pas de `UPDATE` ni `DELETE` sur `audit_events` (rôle applicatif restreint)
- Corrections via événement compensatoire `audit.correction`
- Rétention minimale : 7 ans pour secteurs régulés (configurable par tenant)

---

## 11. Soft delete

### ADR-007-006 : Suppression logique par défaut

```sql
-- Vue active (utilisée par l'ORM par défaut)
CREATE VIEW kb.documents_active AS
SELECT * FROM kb.documents WHERE deleted_at IS NULL;
```

### Comportement applicatif

| Opération | Comportement |
|-----------|--------------|
| `DELETE /api/documents/{id}` | Set `deleted_at = now()`, `deleted_by = current_user` |
| `GET /api/documents/{id}` | 404 si `deleted_at IS NOT NULL` |
| `POST /api/documents/{id}/restore` | Admin uniquement, dans fenêtre de rétention |
| `PURGE` (cron) | Hard delete après expiration `retention_policy` |

### Tables sans soft delete

- `audit.audit_events` (immuable)
- Tables de jonction éphémères
- `ai.llm_calls` (coûts — archivage uniquement)

### Impact RAG

Lors du soft delete d'un document :
1. Marquer les chunks `status = 'deleted'`
2. Exclure des requêtes vectorielles (`WHERE deleted_at IS NULL`)
3. Job asynchrone : suppression embeddings après 24 h (grace period restore)

---

## 12. Politique de rétention des données

### Matrice par catégorie

| Catégorie | Rétention active | Archive | Suppression définitive |
|-----------|------------------|---------|----------------------|
| Données métier (CRM, HR) | Durée contrat + 90 j | 7 ans | Après archive |
| Conversations IA | 365 j (défaut) | 2 ans | Configurable tenant |
| Logs LLM (coûts) | 2 ans | 5 ans | Anonymisation PII |
| Audit events | 7 ans | 10 ans | Jamais (sauf GDPR erasure) |
| Embeddings KB | Lié au document parent | — | Avec document |
| Workflow runs | 180 j détail, agrégats 2 ans | 3 ans | Automatique |
| Backups | 30 j quotidien, 12 mensuels | — | Rotation auto |

### Droit à l'effacement (RGPD Article 17)

Processus `core/gdpr/erasure_request` :

1. Vérification identité et légitimité
2. Soft delete immédiat des données personnelles
3. Anonymisation des audit events (remplacement PII par hash)
4. Notification des sous-traitants (OpenAI, etc.) si applicable
5. Confirmation sous 30 jours

### Configuration par tenant

```json
{
  "retention": {
    "conversations_days": 365,
    "documents_days": null,
    "audit_years": 7,
    "auto_purge_enabled": true,
    "legal_hold": false
  }
}
```

---

## 13. Sauvegarde et reprise

### Stratégie minimale (héritée SIH IA, étendue)

| Type | Fréquence | Rétention | RTO | RPO |
|------|-----------|-----------|-----|-----|
| Snapshot complet | Quotidien | 30 j | 4 h | 24 h |
| WAL archiving | Continu | 7 j | 1 h | 5 min |
| Cross-region replica | Temps réel | — | 15 min | < 1 min |
| Test restauration | Mensuel | — | — | — |

### Procédure de restauration

1. Identifier le point de restauration (timestamp ou snapshot ID)
2. Restaurer sur instance de staging
3. Valider intégrité (`alembic current`, comptages par tenant)
4. Basculer DNS / connection string
5. Post-mortem si incident production

---

## 14. Performance et indexation

### Budgets de latence (p95)

| Type de requête | Cible |
|-----------------|-------|
| CRUD simple par PK + org | < 20 ms |
| Liste paginée (50 items) | < 50 ms |
| Recherche full-text | < 100 ms |
| Similarité vectorielle (top-10) | < 150 ms |
| Agrégat analytics | < 500 ms (replica) |

### Outils de diagnostic

- `pg_stat_statements` activé en permanence
- `EXPLAIN (ANALYZE, BUFFERS)` pour requêtes > 100 ms
- Review trimestrielle des index inutilisés (`pg_stat_user_indexes`)

---

## 15. Migration depuis SIH IA

| Composant SIH IA | Cible AI BOS | Action |
|------------------|--------------|--------|
| SQLite dev / PostgreSQL prod | PostgreSQL uniquement | Unifier dès CORE |
| Tables sans `organization_id` | Ajout colonne + backfill | Migration 010 |
| Alembic `001-003` | Reprise conventions | Adapter schémas |
| Audit JSONL fichier | `audit.audit_events` | Import + dual-write temporaire |
| `chatbot_knowledge.json` | `kb.documents` + `kb.chunks` | Voir README_09_RAG |

---

## 16. Definition of Done — Base de données

- [ ] Schéma `core` migré sans erreur sur staging
- [ ] RLS activé et testé sur toutes les tables tenant-scoped
- [ ] Chaîne Alembic linéaire avec CI upgrade/downgrade
- [ ] pgvector opérationnel avec index HNSW
- [ ] Audit events partitionnés et immuables
- [ ] Soft delete + purge automatique configurés
- [ ] Backup/restauration testés ce mois-ci
- [ ] Requêtes principales < budgets p95 documentés
- [ ] Matrice rétention validée par Legal/DPO

---

## Références

- [README_18_MultiTenant](README_18_MultiTenant.md) — Isolation tenant complète
- [README_09_RAG](README_09_RAG.md) — Schéma knowledge base
- [README_14_Security](README_14_Security.md) — Chiffrement et accès
- [SIH IA Alembic](../../sihia-platform/backend/alembic/) — Implémentation de référence

---

*Documentation propriétaire — AI BOS Platform Team. © 2026 AI BOS.*
