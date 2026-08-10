from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
import time

import httpx

from app.core.config import Settings
from app.rag.types import KnowledgeChunk, RetrievedChunk, chunk_payload


class VectorStoreError(RuntimeError):
    pass


class VectorRepository(ABC):
    @abstractmethod
    def ensure_collection(self, dimensions: int) -> None: ...
    @abstractmethod
    def upsert(self, chunks: list[KnowledgeChunk], vectors: list[list[float]]) -> None: ...
    @abstractmethod
    def search(self, vector: list[float], limit: int, threshold: float, filters: dict[str, Any] | None = None) -> list[RetrievedChunk]: ...
    @abstractmethod
    def delete_document(self, document_id: str) -> None: ...


class QdrantVectorRepository(VectorRepository):
    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.qdrant_url.rstrip("/")
        self.collection = settings.qdrant_collection
        self.headers = {"api-key": settings.qdrant_api_key} if settings.qdrant_api_key else {}

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = httpx.request(method, f"{self.base_url}{path}", headers=self.headers, timeout=15.0, **kwargs)
                if response.status_code not in {408, 429} and response.status_code < 500:
                    response.raise_for_status()
                    return response
                last_error = httpx.HTTPStatusError("transient Qdrant error", request=response.request, response=response)
            except httpx.TransportError as exc:
                last_error = exc
            except httpx.HTTPStatusError as exc:
                raise VectorStoreError("Qdrant rejected the request") from exc
            if attempt < 2:
                time.sleep(0.2 * (attempt + 1))
        raise VectorStoreError("Qdrant request failed") from last_error

    def ensure_collection(self, dimensions: int) -> None:
        try:
            check = httpx.get(f"{self.base_url}/collections/{self.collection}", headers=self.headers, timeout=10.0)
        except httpx.HTTPError as exc:
            raise VectorStoreError("Qdrant is unavailable") from exc
        if check.status_code == 404:
            self._request("PUT", f"/collections/{self.collection}", json={
                "vectors": {"size": dimensions, "distance": "Cosine"},
                "on_disk_payload": True,
            })
            return
        try:
            check.raise_for_status()
            size = check.json()["result"]["config"]["params"]["vectors"]["size"]
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise VectorStoreError("Could not inspect Qdrant collection") from exc
        if int(size) != dimensions:
            raise VectorStoreError(f"Qdrant collection dimension mismatch: {size} != {dimensions}")

    def upsert(self, chunks: list[KnowledgeChunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("Chunk/vector count mismatch")
        self._request("PUT", f"/collections/{self.collection}/points?wait=true", json={
            "points": [{"id": chunk.id, "vector": vector, "payload": chunk_payload(chunk)} for chunk, vector in zip(chunks, vectors)]
        })

    @staticmethod
    def _filter(filters: dict[str, Any] | None) -> dict[str, Any] | None:
        conditions = [{"key": key, "match": {"value": value}} for key, value in (filters or {}).items() if value is not None]
        return {"must": conditions} if conditions else None

    def search(self, vector: list[float], limit: int, threshold: float, filters: dict[str, Any] | None = None) -> list[RetrievedChunk]:
        body: dict[str, Any] = {"vector": vector, "limit": limit, "score_threshold": threshold, "with_payload": True}
        qfilter = self._filter(filters)
        if qfilter:
            body["filter"] = qfilter
        rows = self._request("POST", f"/collections/{self.collection}/points/search", json=body).json().get("result", [])
        results: list[RetrievedChunk] = []
        for row in rows:
            payload = row.get("payload") or {}
            chunk = KnowledgeChunk(
                id=str(row["id"]), document_id=str(payload["document_id"]), content=str(payload["content"]),
                chunk_index=int(payload["chunk_index"]), filename=str(payload["filename"]), source=str(payload["source"]),
                content_type=str(payload["content_type"]), checksum=str(payload["checksum"]),
                page_number=payload.get("page_number"), section=payload.get("section"),
            )
            results.append(RetrievedChunk(chunk=chunk, score=float(row["score"]), dense_score=float(row["score"])))
        return results

    def delete_document(self, document_id: str) -> None:
        self._request("POST", f"/collections/{self.collection}/points/delete?wait=true", json={
            "filter": {"must": [{"key": "document_id", "match": {"value": document_id}}]}
        })


class MemoryVectorRepository(VectorRepository):
    """Test double; deliberately explicit rather than a production fallback."""
    def __init__(self) -> None:
        self.rows: dict[str, tuple[KnowledgeChunk, list[float]]] = {}
    def ensure_collection(self, dimensions: int) -> None:
        self.dimensions = dimensions
    def upsert(self, chunks: list[KnowledgeChunk], vectors: list[list[float]]) -> None:
        self.rows.update({c.id: (c, v) for c, v in zip(chunks, vectors)})
    def search(self, vector: list[float], limit: int, threshold: float, filters: dict[str, Any] | None = None) -> list[RetrievedChunk]:
        import math
        found = []
        for chunk, candidate in self.rows.values():
            if any(getattr(chunk, key, chunk.metadata.get(key)) != value for key, value in (filters or {}).items()):
                continue
            denom = math.sqrt(sum(x*x for x in vector)) * math.sqrt(sum(x*x for x in candidate))
            score = sum(a*b for a, b in zip(vector, candidate)) / denom if denom else 0.0
            if score >= threshold:
                found.append(RetrievedChunk(chunk, score, dense_score=score))
        return sorted(found, key=lambda r: r.score, reverse=True)[:limit]
    def delete_document(self, document_id: str) -> None:
        self.rows = {key: value for key, value in self.rows.items() if value[0].document_id != document_id}
