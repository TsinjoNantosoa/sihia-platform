# Assistant documentaire RAG SIHIA

L'assistant fournit des informations et une orientation à partir du corpus validé. Il ne pose pas de diagnostic et ne prescrit pas. Les urgences et demandes médicales dangereuses sont interceptées avant la génération.

Le flux implémenté comprend :

- ingestion PDF, Markdown et texte avec validation, empreinte SHA-256 et métadonnées ;
- stockage des chunks en SQL et des embeddings dans Qdrant ;
- récupération hybride dense/BM25, fusion RRF et reranking cross-encoder avec fallback lexical ;
- prompt limité aux preuves récupérées, réponse SSE et citations structurées ;
- audit sans contenu conversationnel brut et contrôle d'accès JWT/RBAC ;
- benchmark de récupération local et évaluation RAGAS facultative des réponses générées.

La description de référence, les variables et les modes de défaillance sont maintenus dans [`docs/RAG_ARCHITECTURE.md`](../docs/RAG_ARCHITECTURE.md). Les commandes d'installation, de démonstration et d'évaluation sont dans le [`README.md`](../README.md) racine.
