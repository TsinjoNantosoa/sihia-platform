# AI BOS — Retrieval-Augmented Generation (RAG)

> **Version:** 0.1.0 | **Statut:** `DESIGN` | **Maturité:** `ALPHA`  
> **Dernière mise à jour:** Juillet 2026  
> **Audience:** AI/ML Engineering, Backend, Knowledge Management  
> **Référence héritage:** [SIH IA chatbot_knowledge.json](../../sihia-platform/backend/data/chatbot_knowledge.json), [ChatbotService._retrieve_context](../../sihia-platform/backend/app/application/chatbot_service.py)

---

## 1. Objectif

Le module RAG d'AI BOS transforme les connaissances dispersées de l'entreprise (documents, FAQ, procédures, données structurées) en contexte exploitable par les agents IA, avec **isolation tenant**, **traçabilité des sources** et **rafraîchissement continu**.

SIH IA démontre un RAG minimaliste : fichier JSON statique `chatbot_knowledge.json` avec matching par mots-clés (`topics`). AI BOS généralise ce pattern vers une **base de connaissances dynamique, multi-format et vectorielle**.

### Évolution SIH IA → AI BOS

| Aspect | SIH IA (actuel) | AI BOS (cible) |
|--------|-----------------|----------------|
| Stockage | `chatbot_knowledge.json` | PostgreSQL + pgvector |
| Retrieval | Score mots-clés sur `topics` | Hybrid search (sémantique + lexical) |
| Formats | HTML statique FR/EN | PDF, DOCX, MD, HTML, CSV, API |
| Mise à jour | Déploiement code | Ingestion async + webhook |
| Isolation | Client ID UI uniquement | `organization_id` + RLS |
| Sources | Non exposées | Citations traçables |

---

## 2. Architecture du pipeline RAG

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE — AI BOS                            │
└─────────────────────────────────────────────────────────────────────────┘

  INGEST          CHUNK           EMBED           INDEX
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Upload  │───▶│ Split   │───▶│ Vectorize│───▶│ Store   │
│ Crawl   │    │ Overlap │    │ Batch   │    │ pgvector│
│ API     │    │ Metadata│    │ Cache   │    │ tsvector│
│ Webhook │    └─────────┘    └─────────┘    └─────────┘
└─────────┘

  QUERY TIME
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Query   │───▶│ Retrieve│───▶│ Rerank  │───▶│ Generate│
│ Expand  │    │ Hybrid  │    │ Cross-  │    │ + Cite  │
│ Embed   │    │ Top-K   │    │ encoder │    │ Sources │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Composants CORE

| Module | Responsabilité |
|--------|----------------|
| `core/ai/rag/ingest` | Réception et normalisation documents |
| `core/ai/rag/chunker` | Découpage intelligent |
| `core/ai/rag/embedder` | Génération vecteurs via LLM Gateway |
| `core/ai/rag/indexer` | Persistance pgvector + full-text |
| `core/ai/rag/retriever` | Recherche hybride |
| `core/ai/rag/reranker` | Re-classement pertinence |
| `core/ai/rag/generator` | Assembly prompt + citations |

---

## 3. Phase INGEST

### Sources d'ingestion

| Source | Trigger | Exemple |
|--------|---------|---------|
| **Upload manuel** | UI / API | PDF politique RH |
| **Dossier surveillé** | Cron / watcher | `/imports/kb/` |
| **Webhook** | Event externe | CRM mis à jour |
| **Crawl web** | Planifié | Site corporate |
| **Connecteur** | OAuth | Google Drive, SharePoint, Notion |
| **API interne** | Event Bus | `document.created` |
| **Migration** | One-shot | `chatbot_knowledge.json` |

### Schéma document

```sql
CREATE TABLE kb.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,        -- upload | crawl | api | connector
    source_uri TEXT,                  -- URL ou chemin original
    mime_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,       -- SHA-256 du contenu brut
    raw_content BYTEA,                -- optionnel, chiffré si sensible
    status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | indexed | failed | archived
    metadata JSONB NOT NULL DEFAULT '{}',
    language TEXT,                      -- détecté automatiquement
    version INTEGER NOT NULL DEFAULT 1,
    parent_document_id UUID,            -- versioning
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, content_hash)
);
```

### Pipeline d'ingestion

```python
async def ingest_document(doc_id: UUID, organization_id: UUID) -> IngestResult:
    doc = await document_repo.get(doc_id, organization_id)
    
    # 1. Extraction texte
    text = await extractors.resolve(doc.mime_type).extract(doc.raw_content)
    
    # 2. Détection langue
    lang = await language_detector.detect(text)
    
    # 3. Classification sensibilité
    classification = await classify_sensitivity(text)
    
    # 4. Chunking
    chunks = await chunker.split(text, config=org.chunk_config)
    
    # 5. Embedding batch
    embeddings = await embedder.embed_batch([c.content for c in chunks])
    
    # 6. Indexation
    await indexer.index(doc, chunks, embeddings)
    
    # 7. Event
    await event_bus.publish("kb.document.indexed", {"doc_id": doc_id})
    
    return IngestResult(chunks_count=len(chunks), status="indexed")
```

### Extracteurs par type MIME

| MIME | Extracteur | Notes |
|------|------------|-------|
| `application/pdf` | PyMuPDF / pdfplumber | OCR si scan (Tesseract) |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | python-docx | |
| `text/markdown` | Direct | Préservation structure |
| `text/html` | BeautifulSoup | Nettoyage tags |
| `text/csv` | pandas | Une ligne = chunk potentiel |
| `application/json` | Parser custom | Migration knowledge.json |
| `image/*` | OCR + description VLM | Optionnel |

---

## 4. Phase CHUNK

### ADR-009-001 : Chunking sémantique avec overlap

### Stratégies de découpage

| Stratégie | Cas d'usage | Taille cible |
|-----------|-------------|--------------|
| **Fixed** | Logs, données tabulaires | 512 tokens, overlap 50 |
| **Recursive** | Documents longs génériques | 1024 tokens, overlap 100 |
| **Semantic** | Rapports, articles | Frontières paragraphe/section |
| **Structured** | FAQ, knowledge.json | 1 entrée = 1 chunk |
| **Code** | Repositories | Par fonction/classe |

### Schéma chunk

```sql
CREATE TABLE kb.chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES kb.documents(id),
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    -- heading_path, page_number, section_title
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### Migration depuis chatbot_knowledge.json

Transformation du format SIH IA :

```json
// SIH IA — entrée statique
{
  "id": "appointments",
  "topics": ["rendez-vous", "rdv", "appointment"],
  "fr": "<p>Pour un rendez-vous...</p>",
  "en": "<p>For an appointment...</p>"
}
```

Devient dans AI BOS :

```sql
-- Document parent
INSERT INTO kb.documents (title, source_type, metadata)
VALUES ('FAQ Rendez-vous', 'migration', '{"legacy_id": "appointments"}');

-- Chunks par langue
INSERT INTO kb.chunks (document_id, chunk_index, content, metadata)
VALUES
  (doc_id, 0, 'Pour un rendez-vous : connectez-vous...', 
   '{"lang": "fr", "topics": ["rendez-vous", "rdv"]}'),
  (doc_id, 1, 'For an appointment: sign in...', 
   '{"lang": "en", "topics": ["appointment"]}');
```

Les `topics` deviennent des métadonnées enrichissant la recherche lexicale.

### Configuration par tenant

```yaml
chunking:
  strategy: recursive
  max_tokens: 1024
  overlap_tokens: 100
  preserve_tables: true
  preserve_code_blocks: true
```

---

## 5. Phase EMBED

### Modèles d'embedding

| Modèle | Dimensions | Cas d'usage |
|--------|------------|-------------|
| `text-embedding-3-small` | 1536 | Défaut, bon rapport qualité/coût |
| `text-embedding-3-large` | 3072 | Haute précision, gros corpus |
| `BGE-large-en-v1.5` | 1024 | Local, air-gapped |
| `multilingual-e5-large` | 1024 | FR/EN/AR (héritage i18n SIH IA) |

### Batch processing

```python
async def embed_batch(texts: list[str], model: str) -> list[list[float]]:
    # Batch de 100 max pour optimiser coût/latence
    batches = chunk_list(texts, size=100)
    results = []
    for batch in batches:
        response = await llm_gateway.embed(EmbedRequest(
            texts=batch,
            model=model,
        ))
        results.extend(response.embeddings)
    return results
```

### Cache d'embeddings

```sql
CREATE TABLE kb.embedding_cache (
    content_hash TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Évite re-embedding si contenu identique (déduplication cross-tenant interdite pour isolation).

---

## 6. Phase INDEX

### Index hybride

```sql
-- Vecteurs (pgvector)
CREATE INDEX idx_embeddings_hnsw ON kb.embeddings
    USING hnsw (embedding vector_cosine_ops);

-- Full-text (tsvector)
ALTER TABLE kb.chunks ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('french', content)) STORED;
CREATE INDEX idx_chunks_fts ON kb.chunks USING gin(content_tsv);

-- Métadonnées
CREATE INDEX idx_chunks_org_doc ON kb.chunks (organization_id, document_id);
CREATE INDEX idx_chunks_metadata ON kb.chunks USING gin(metadata);
```

### Choix Vector DB

Voir [README_07_Database](README_07_Database.md) ADR-007-005.

**Résumé :**
- **pgvector** : défaut, cohérence transactionnelle, RLS natif
- **Pinecone** : option Enterprise > 5 M chunks, latence optimisée

### Abstraction indexer

```python
class VectorIndexer(Protocol):
    async def upsert(self, chunks: list[ChunkWithEmbedding]) -> None: ...
    async def delete(self, document_id: UUID) -> None: ...
    async def search(self, query_vector: list[float], top_k: int, filters: dict) -> list[ScoredChunk]: ...
```

---

## 7. Phase RETRIEVE

### Recherche hybride

Combine similarité vectorielle et correspondance lexicale :

```python
async def hybrid_search(
    query: str,
    organization_id: UUID,
    top_k: int = 20,
    alpha: float = 0.7,  # poids sémantique vs lexical
) -> list[ScoredChunk]:
    query_vector = await embedder.embed(query)
    
    # Recherche vectorielle
    vector_results = await vector_index.search(
        query_vector, top_k=top_k * 2,
        filters={"organization_id": organization_id},
    )
    
    # Recherche full-text (héritage topics SIH IA)
    fts_results = await fts_search(
        query, organization_id, top_k=top_k * 2,
    )
    
    # Fusion RRF (Reciprocal Rank Fusion)
    return reciprocal_rank_fusion(vector_results, fts_results, alpha=alpha)[:top_k]
```

### Query expansion

Pour améliorer le recall (équivalent intelligent des `topics` SIH IA) :

```python
expanded_queries = [
    query,
    await llm_gateway.complete(synonym_prompt(query)),  # synonymes
    hyde_query(query),  # Hypothetical Document Embedding
]
```

### Filtres de retrieval

```python
RetrievalFilters(
    organization_id=org_id,           # OBLIGATOIRE
    document_ids=[...],               # scope agent
    languages=["fr", "en"],
    metadata={"department": "hr"},
    min_freshness_days=30,            # documents récents uniquement
    exclude_deleted=True,
)
```

---

## 8. Phase RERANK

### ADR-009-002 : Reranking pour précision

Le retrieval initial (top-20) est ré-ordonné par un cross-encoder pour sélectionner les top-5 finaux.

| Modèle | Latence | Qualité |
|--------|---------|---------|
| `cohere-rerank-v3` | ~100 ms | Excellente |
| `bge-reranker-large` | ~50 ms (local) | Très bonne |
| LLM-as-reranker | ~500 ms | Fallback |

```python
async def rerank(query: str, chunks: list[ScoredChunk], top_k: int = 5) -> list[ScoredChunk]:
    scores = await reranker.score(
        query=query,
        documents=[c.content for c in chunks],
    )
    ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    return [c for c, _ in ranked[:top_k]]
```

---

## 9. Phase GENERATE

### Assembly du contexte

```python
def build_rag_prompt(query: str, chunks: list[ScoredChunk], lang: str) -> str:
    context = "\n\n---\n\n".join(
        f"[Source: {c.document_title} | {c.metadata.get('section', '')}]\n{c.content}"
        for c in chunks
    )
    return f"""
Utilise UNIQUEMENT les informations ci-dessous pour répondre.
Si l'information n'est pas présente, dis-le explicitement.
Cite les sources utilisées.

## Contexte
{context}

## Question
{query}
"""
```

### Citations traçables

Réponse enrichie avec sources (amélioration vs SIH IA qui retourne `sources: list[str]` internes) :

```json
{
  "answer": "<p>Pour un rendez-vous, connectez-vous...</p>",
  "sources": [
    {
      "document_id": "uuid",
      "document_title": "FAQ Rendez-vous",
      "chunk_id": "uuid",
      "relevance_score": 0.92,
      "excerpt": "Pour un rendez-vous : connectez-vous..."
    }
  ],
  "faithfulness_score": 0.95
}
```

### Faithfulness check

Post-génération, vérifier que chaque affirmation est supportée par un chunk :

```python
faithfulness = await eval_faithfulness(answer, chunks)
if faithfulness < 0.6:
    return escalate_to_hitl(query, answer, chunks)
```

---

## 10. Isolation tenant

### ADR-009-003 : Zéro fuite cross-tenant

| Couche | Mécanisme |
|--------|-----------|
| **Ingestion** | `organization_id` vérifié à l'upload |
| **Stockage** | RLS PostgreSQL sur toutes tables `kb.*` |
| **Embedding** | Pas de cache cross-tenant |
| **Retrieval** | Filtre `organization_id` obligatoire (non désactivable) |
| **Génération** | Contexte scopé, audit trail |

### Tests d'isolation

```python
async def test_no_cross_tenant_leak():
    # Indexer doc pour org_A
    await ingest(test_doc, organization_id=org_a)
    
    # Rechercher depuis org_B
    results = await retriever.search("contenu secret", organization_id=org_b)
    
    assert len(results) == 0
```

### Knowledge bases par agent

Un agent peut être limité à un sous-ensemble de documents :

```yaml
agent:
  id: agent.hr
  knowledge_scopes:
    - document_tags: ["hr", "policy"]
    - folder_ids: ["folder-onboarding"]
  exclude_tags: ["confidential-executive"]
```

---

## 11. Types de documents

### Taxonomie

| Type | Description | Chunking | Refresh |
|------|-------------|----------|---------|
| **FAQ** | Questions-réponses | 1 Q/R = 1 chunk | Manuel |
| **Policy** | Politiques entreprise | Sémantique par section | Trimestriel |
| **Procedure** | Procédures opérationnelles | Sémantique | À chaque modification |
| **Product** | Fiches produit | Par produit | Webhook CRM |
| **Legal** | Contrats, CGV | Par clause | Versioning |
| **Training** | Supports formation | Par module | Annuel |
| **API docs** | Documentation technique | Par endpoint | CI/CD |
| **Conversation** | Historique validé | Par échange | Import HITL |

### Métadonnées standard

```json
{
  "document_type": "policy",
  "department": "hr",
  "tags": ["onboarding", "france"],
  "effective_date": "2026-01-01",
  "expiry_date": null,
  "author": "user-uuid",
  "reviewers": ["user-uuid"],
  "classification": "internal",
  "language": "fr"
}
```

---

## 12. Stratégies de rafraîchissement

### Modes de refresh

| Mode | Trigger | Latence | Cas d'usage |
|------|---------|---------|-------------|
| **Realtime** | Webhook / Event | < 1 min | CRM, tickets |
| **Near-realtime** | Polling 5 min | < 5 min | Drive, SharePoint |
| **Scheduled** | Cron | Configurable | Crawl web, rapports |
| **Manual** | UI / API | Immédiat | Upload ponctuel |
| **On-demand** | Agent request | < 30 s | Document externe temporaire |

### Détection de changement

```python
async def check_document_freshness(doc: Document) -> RefreshDecision:
    current_hash = sha256(await fetch_content(doc.source_uri))
    if current_hash != doc.content_hash:
        return RefreshDecision.REINDEX
    if doc.updated_at < utc_now() - timedelta(days=doc.max_age_days):
        return RefreshDecision.REINDEX
    return RefreshDecision.SKIP
```

### Pipeline de re-indexation

```
1. Marquer document status = 'processing'
2. Supprimer anciens chunks + embeddings (soft delete)
3. Re-ingérer contenu
4. Générer nouveaux embeddings
5. Indexer
6. status = 'indexed'
7. Event 'kb.document.reindexed'
```

### Invalidation sélective

Lors d'une mise à jour partielle (ex: une section d'une policy) :
- Identifier les chunks affectés par `content_hash` par chunk
- Re-embedder uniquement les chunks modifiés
- Réduire coût vs re-indexation complète

### Monitoring fraîcheur

```sql
SELECT 
    organization_id,
    COUNT(*) FILTER (WHERE updated_at < now() - interval '30 days') AS stale_count,
    COUNT(*) AS total
FROM kb.documents
WHERE deleted_at IS NULL
GROUP BY organization_id;
```

Alerte si `stale_count / total > 0.2` pour un tenant.

---

## 13. API RAG

### Endpoints principaux

```
POST   /api/kb/documents              # Upload document
GET    /api/kb/documents              # Liste paginée
GET    /api/kb/documents/{id}         # Détail + statut indexation
DELETE /api/kb/documents/{id}         # Soft delete
POST   /api/kb/documents/{id}/reindex # Force re-indexation

POST   /api/kb/search                 # Recherche hybride (debug)
POST   /api/kb/ask                    # RAG complet (retrieve + generate)

GET    /api/kb/folders                # Arborescence
POST   /api/kb/connectors             # Config connecteur externe
```

### Exemple requête RAG

```json
POST /api/kb/ask
{
  "query": "Comment prendre un rendez-vous ?",
  "lang": "fr",
  "top_k": 5,
  "agent_id": "agent.reception",
  "include_sources": true
}
```

---

## 14. Métriques et qualité

### KPIs RAG

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Precision@5 | > 0.8 | Eval golden set |
| Faithfulness | > 0.85 | LLM-as-judge |
| Latency p95 retrieval | < 200 ms | Prometheus |
| Latency p95 end-to-end | < 3 s | Prometheus |
| Index success rate | > 99% | Ingestion logs |
| Stale document ratio | < 10% | Monitoring |

### Eval golden set

```yaml
# evals/rag/sihia_faq.yaml — migré depuis chatbot_knowledge.json
- query: "Comment prendre rendez-vous ?"
  expected_doc_ids: ["appointments"]
  expected_topics: ["rendez-vous", "rdv"]
  lang: fr

- query: "What are the opening hours?"
  expected_doc_ids: ["hours"]
  lang: en
```

---

## 15. Definition of Done — RAG

- [ ] Pipeline ingest → index opérationnel pour PDF, MD, JSON
- [ ] Migration `chatbot_knowledge.json` automatisée
- [ ] Hybrid search (vector + FTS) avec RRF
- [ ] Reranking activé
- [ ] Citations sources dans réponses
- [ ] Isolation tenant testée (0 fuite)
- [ ] Refresh scheduled + webhook
- [ ] Eval golden set ≥ 30 cas, precision@5 > 0.8
- [ ] Faithfulness check avec escalade HITL
- [ ] Métriques Prometheus exposées

---

## Références

- [README_07_Database](README_07_Database.md) — Schéma pgvector
- [README_08_AIArchitecture](README_08_AIArchitecture.md) — LLM Gateway, guardrails
- [README_10_Agents](README_10_Agents.md) — Agents consommateurs RAG
- [SIH IA chatbot_knowledge.json](../../sihia-platform/backend/data/chatbot_knowledge.json)

---

*Documentation propriétaire — AI BOS Platform Team. © 2026 AI BOS.*
