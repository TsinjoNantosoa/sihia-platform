from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class ParsedSection:
    text: str
    page_number: int | None = None
    title: str | None = None


@dataclass(slots=True)
class KnowledgeChunk:
    id: str
    document_id: str
    content: str
    chunk_index: int
    filename: str
    source: str
    content_type: str
    checksum: str
    page_number: int | None = None
    section: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RetrievedChunk:
    chunk: KnowledgeChunk
    score: float
    dense_score: float = 0.0
    lexical_score: float = 0.0

    def citation(self) -> dict[str, Any]:
        excerpt = " ".join(self.chunk.content.split())[:280]
        return {
            "document_id": self.chunk.document_id,
            "filename": self.chunk.filename,
            "page": self.chunk.page_number,
            "section": self.chunk.section,
            "score": round(self.score, 4),
            "excerpt": excerpt,
        }


def chunk_payload(chunk: KnowledgeChunk) -> dict[str, Any]:
    payload = asdict(chunk)
    payload.update(payload.pop("metadata"))
    return payload
