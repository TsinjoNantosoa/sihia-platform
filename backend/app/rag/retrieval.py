from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from typing import Any

from app.rag.document_repository import KnowledgeDocumentRepository
from app.rag.embeddings import EmbeddingProvider
from app.rag.types import KnowledgeChunk, RetrievedChunk
from app.rag.vector_repository import VectorRepository, VectorStoreError

_STOP_WORDS = {
    "and", "are", "for", "how", "the", "this", "what", "with", "your",
    "aux", "avec", "ces", "comment", "dans", "des", "est", "les", "quel", "quelle",
    "sont", "sur", "une", "vos",
}


def normalize_query(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower().strip()
    return re.sub(r"\s+", " ", text)


def _terms(text: str) -> list[str]:
    plain = "".join(c for c in unicodedata.normalize("NFKD", normalize_query(text)) if not unicodedata.combining(c))
    return [term for term in re.findall(r"[\w-]{2,}", plain) if term not in _STOP_WORDS]


class LexicalRetriever:
    """Small-corpus BM25 implementation over persisted chunks."""
    def __init__(self, documents: KnowledgeDocumentRepository) -> None:
        self.documents = documents

    def search(self, query: str, limit: int, filters: dict[str, Any] | None = None) -> list[RetrievedChunk]:
        chunks = self.documents.list_chunks(filters)
        if not chunks:
            return []
        query_terms = _terms(query)
        if not query_terms:
            return []
        tokenized = [_terms(chunk.content) for chunk in chunks]
        avgdl = sum(map(len, tokenized)) / len(tokenized)
        doc_freq = Counter(term for terms in tokenized for term in set(terms))
        scored: list[RetrievedChunk] = []
        for chunk, terms in zip(chunks, tokenized):
            frequencies = Counter(terms)
            score = 0.0
            for term in query_terms:
                if not frequencies[term]:
                    continue
                idf = math.log(1 + (len(chunks) - doc_freq[term] + 0.5) / (doc_freq[term] + 0.5))
                freq = frequencies[term]
                score += idf * (freq * 2.2) / (freq + 1.2 * (0.25 + 0.75 * len(terms) / max(avgdl, 1)))
            if score > 0:
                scored.append(RetrievedChunk(chunk, score, lexical_score=score))
        return sorted(scored, key=lambda row: row.score, reverse=True)[:limit]


class LightweightReranker:
    """Deterministic reranker; replaceable with a cross-encoder without retrieval changes."""
    def rerank(self, query: str, candidates: list[RetrievedChunk]) -> list[RetrievedChunk]:
        query_terms = set(_terms(query))
        for item in candidates:
            content_terms = set(_terms(item.chunk.content))
            overlap = len(query_terms & content_terms) / max(len(query_terms), 1)
            phrase = 1.0 if normalize_query(query) in normalize_query(item.chunk.content) else 0.0
            item.score = 0.75 * item.score + 0.2 * overlap + 0.05 * phrase
        return sorted(candidates, key=lambda row: row.score, reverse=True)


class HybridRetriever:
    def __init__(
        self,
        embeddings: EmbeddingProvider,
        vectors: VectorRepository,
        documents: KnowledgeDocumentRepository,
        *,
        top_k: int,
        final_k: int,
        threshold: float,
        hybrid_enabled: bool = True,
        rerank_enabled: bool = True,
    ) -> None:
        self.embeddings, self.vectors, self.documents = embeddings, vectors, documents
        self.top_k, self.final_k, self.threshold = top_k, final_k, threshold
        self.hybrid_enabled, self.rerank_enabled = hybrid_enabled, rerank_enabled
        self.lexical = LexicalRetriever(documents)
        self.reranker = LightweightReranker()

    @staticmethod
    def _rrf(dense: list[RetrievedChunk], lexical: list[RetrievedChunk]) -> list[RetrievedChunk]:
        merged: dict[str, RetrievedChunk] = {}
        for ranking, weight, attr in ((dense, 0.65, "dense_score"), (lexical, 0.35, "lexical_score")):
            for rank, item in enumerate(ranking, 1):
                current = merged.setdefault(item.chunk.id, RetrievedChunk(item.chunk, 0.0))
                setattr(current, attr, item.score)
                current.score += weight / (60 + rank)
        if merged:
            max_score = max(row.score for row in merged.values()) or 1
            for row in merged.values():
                row.score /= max_score
        return sorted(merged.values(), key=lambda row: row.score, reverse=True)

    def retrieve(self, query: str, filters: dict[str, Any] | None = None) -> list[RetrievedChunk]:
        query = normalize_query(query)
        dense: list[RetrievedChunk] = []
        try:
            vector = self.embeddings.embed([query])[0]
            self.vectors.ensure_collection(self.embeddings.dimensions)
            dense = self.vectors.search(vector, self.top_k, self.threshold, filters)
        except (VectorStoreError, RuntimeError, IndexError):
            # Qdrant/provider outages degrade to the persisted lexical index; never to LLM memory.
            dense = []
        lexical = self.lexical.search(query, self.top_k, filters) if self.hybrid_enabled else []
        if dense and lexical:
            candidates = self._rrf(dense, lexical)
        elif dense:
            candidates = dense
        else:
            # BM25 values are not probabilities. Normalize only for the common relevance gate.
            candidates = lexical
            if candidates:
                maximum = candidates[0].score
                for item in candidates:
                    item.score = item.score / maximum
        if self.rerank_enabled:
            candidates = self.reranker.rerank(query, candidates)
        return [item for item in candidates if item.score >= self.threshold][: self.final_k]


def build_context(results: list[RetrievedChunk], max_chars: int = 12000) -> str:
    parts: list[str] = []
    used = 0
    for index, result in enumerate(results, 1):
        label = f"[SOURCE {index}: {result.chunk.filename}"
        if result.chunk.page_number:
            label += f", page {result.chunk.page_number}"
        if result.chunk.section:
            label += f", section {result.chunk.section}"
        block = f"{label}]\n{result.chunk.content}"
        if used + len(block) > max_chars:
            break
        parts.append(block)
        used += len(block)
    return "\n\n".join(parts)
