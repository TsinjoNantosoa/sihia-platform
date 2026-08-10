from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.logging_config import log_event
from app.rag.chunking import RecursiveChunker
from app.rag.document_repository import KnowledgeDocumentRepository
from app.rag.embeddings import EmbeddingProvider
from app.rag.parsers import DocumentParseError, parse_document
from app.rag.vector_repository import VectorRepository

logger = logging.getLogger("sihia.rag")
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".markdown"}


def document_checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def safe_filename(filename: str) -> str:
    name = Path(filename or "document").name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(". ")
    return name[:180] or "document.txt"


class DuplicateDocumentError(ValueError):
    def __init__(self, document: dict[str, Any]) -> None:
        super().__init__("This document has already been ingested")
        self.document = document


class DocumentIngestionService:
    def __init__(
        self,
        documents: KnowledgeDocumentRepository,
        embeddings: EmbeddingProvider,
        vectors: VectorRepository,
        chunker: RecursiveChunker,
        storage_dir: Path,
        max_upload_bytes: int,
    ) -> None:
        self.documents, self.embeddings, self.vectors, self.chunker = documents, embeddings, vectors, chunker
        self.storage_dir, self.max_upload_bytes = storage_dir, max_upload_bytes

    def ingest(self, content: bytes, filename: str, content_type: str, *, source: str = "upload", created_by: str | None = None) -> dict[str, Any]:
        filename = safe_filename(filename)
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            raise DocumentParseError("Allowed formats: PDF, TXT, Markdown")
        if not content or len(content) > self.max_upload_bytes:
            raise DocumentParseError(f"Document must be between 1 byte and {self.max_upload_bytes} bytes")
        checksum = document_checksum(content)
        duplicate = self.documents.find_by_checksum(checksum)
        if duplicate:
            raise DuplicateDocumentError(duplicate)
        document_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "id": document_id, "filename": filename, "source": source, "content_type": content_type,
            "size_bytes": len(content), "checksum": checksum, "status": "processing", "chunk_count": 0,
            "error_message": None, "created_at": now, "updated_at": now, "created_by": created_by,
        }
        self.documents.create(record)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        original_path = self.storage_dir / f"{document_id}{suffix}"
        original_path.write_bytes(content)
        try:
            sections = parse_document(content, filename, content_type)
            chunks = self.chunker.chunk(sections, document_id=document_id, filename=filename, source=source,
                                        content_type=content_type, checksum=checksum)
            if not chunks:
                raise DocumentParseError("No indexable text was extracted")
            vectors: list[list[float]] = []
            for start in range(0, len(chunks), 64):
                vectors.extend(self.embeddings.embed([chunk.content for chunk in chunks[start:start + 64]]))
            self.vectors.ensure_collection(self.embeddings.dimensions)
            self.vectors.upsert(chunks, vectors)
            self.documents.replace_chunks(document_id, chunks)
            self.documents.set_status(document_id, "ready", chunk_count=len(chunks))
            log_event(logger, logging.INFO, "rag_document_ingested", documentId=document_id, chunkCount=len(chunks))
        except Exception as exc:
            self.documents.set_status(document_id, "failed", error=str(exc)[:500])
            log_event(logger, logging.ERROR, "rag_ingestion_failed", documentId=document_id, errorType=type(exc).__name__)
            raise
        return self.documents.get(document_id) or record

    def delete(self, document_id: str) -> None:
        document = self.documents.get(document_id)
        if not document:
            raise KeyError(document_id)
        if document.get("status") == "ready":
            self.vectors.delete_document(document_id)
        self.documents.delete(document_id)
        for path in self.storage_dir.glob(f"{document_id}.*"):
            path.unlink(missing_ok=True)

    def reindex(self, document_id: str) -> dict[str, Any]:
        document = self.documents.get(document_id)
        if not document:
            raise KeyError(document_id)
        matches = list(self.storage_dir.glob(f"{document_id}.*"))
        if not matches:
            raise FileNotFoundError("Original document is not available for reindexing")
        self.documents.set_status(document_id, "processing")
        try:
            content = matches[0].read_bytes()
            sections = parse_document(content, document["filename"], document["content_type"])
            chunks = self.chunker.chunk(sections, document_id=document_id, filename=document["filename"],
                                        source=document["source"], content_type=document["content_type"], checksum=document["checksum"])
            vectors = self.embeddings.embed([chunk.content for chunk in chunks])
            self.vectors.ensure_collection(self.embeddings.dimensions)
            if document.get("status") == "ready":
                self.vectors.delete_document(document_id)
            self.vectors.upsert(chunks, vectors)
            self.documents.replace_chunks(document_id, chunks)
            self.documents.set_status(document_id, "ready", chunk_count=len(chunks))
        except Exception as exc:
            self.documents.set_status(document_id, "failed", error=str(exc)[:500])
            raise
        return self.documents.get(document_id) or document

    def import_legacy_json(self, path: Path, created_by: str = "system") -> dict[str, Any]:
        entries = json.loads(path.read_text(encoding="utf-8"))
        lines = ["# SIHIA legacy chatbot knowledge"]
        for entry in entries:
            clean_fr = re.sub(r"<[^>]+>", " ", str(entry.get("fr", "")))
            clean_en = re.sub(r"<[^>]+>", " ", str(entry.get("en", "")))
            lines.extend([f"\n## {entry.get('title', entry.get('id', 'Knowledge'))}", clean_fr, clean_en])
        return self.ingest("\n".join(lines).encode(), "chatbot_knowledge.md", "text/markdown", source="legacy-json", created_by=created_by)
