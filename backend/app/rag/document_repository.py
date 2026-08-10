from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.infrastructure.database import connect
from app.rag.types import KnowledgeChunk


class KnowledgeDocumentRepository:
    def find_by_checksum(self, checksum: str) -> dict[str, Any] | None:
        db = connect()
        try:
            return db.execute("SELECT * FROM knowledge_documents WHERE checksum=?", (checksum,)).fetchone()
        finally:
            db.close()

    def get(self, document_id: str) -> dict[str, Any] | None:
        db = connect()
        try:
            return db.execute("SELECT * FROM knowledge_documents WHERE id=?", (document_id,)).fetchone()
        finally:
            db.close()

    def list(self) -> list[dict[str, Any]]:
        db = connect()
        try:
            return db.execute("SELECT * FROM knowledge_documents ORDER BY created_at DESC").fetchall()
        finally:
            db.close()

    def create(self, document: dict[str, Any]) -> None:
        db = connect()
        try:
            db.execute(
                """INSERT INTO knowledge_documents
                (id,filename,source,content_type,size_bytes,checksum,status,chunk_count,error_message,created_at,updated_at,created_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                tuple(document[key] for key in (
                    "id", "filename", "source", "content_type", "size_bytes", "checksum", "status",
                    "chunk_count", "error_message", "created_at", "updated_at", "created_by",
                )),
            )
            db.commit()
        finally:
            db.close()

    def set_status(self, document_id: str, status: str, *, chunk_count: int = 0, error: str | None = None) -> None:
        db = connect()
        try:
            db.execute(
                "UPDATE knowledge_documents SET status=?,chunk_count=?,error_message=?,updated_at=? WHERE id=?",
                (status, chunk_count, error, datetime.now(timezone.utc).isoformat(), document_id),
            )
            db.commit()
        finally:
            db.close()

    def replace_chunks(self, document_id: str, chunks: list[KnowledgeChunk]) -> None:
        db = connect()
        try:
            db.execute("DELETE FROM knowledge_chunks WHERE document_id=?", (document_id,))
            db.executemany(
                """INSERT INTO knowledge_chunks
                (id,document_id,content,page_number,section,chunk_index,metadata_json)
                VALUES (?,?,?,?,?,?,?)""",
                [(
                    c.id, c.document_id, c.content, c.page_number, c.section, c.chunk_index,
                    json.dumps({
                        "filename": c.filename, "source": c.source, "content_type": c.content_type,
                        "checksum": c.checksum, **c.metadata,
                    }, ensure_ascii=False),
                ) for c in chunks],
            )
            db.commit()
        finally:
            db.close()

    def list_chunks(self, filters: dict[str, Any] | None = None) -> list[KnowledgeChunk]:
        filters = filters or {}
        sql = """SELECT c.*, d.filename, d.source, d.content_type, d.checksum
                 FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
                 WHERE d.status='ready'"""
        params: list[Any] = []
        for key, column in (("document_id", "c.document_id"), ("content_type", "d.content_type")):
            if filters.get(key) is not None:
                sql += f" AND {column}=?"
                params.append(filters[key])
        db = connect()
        try:
            rows = db.execute(sql, tuple(params)).fetchall()
        finally:
            db.close()
        return [KnowledgeChunk(
            id=row["id"], document_id=row["document_id"], content=row["content"],
            chunk_index=row["chunk_index"], filename=row["filename"], source=row["source"],
            content_type=row["content_type"], checksum=row["checksum"],
            page_number=row["page_number"], section=row["section"],
            metadata=json.loads(row["metadata_json"] or "{}"),
        ) for row in rows]

    def delete(self, document_id: str) -> None:
        db = connect()
        try:
            db.execute("DELETE FROM knowledge_chunks WHERE document_id=?", (document_id,))
            db.execute("DELETE FROM knowledge_documents WHERE id=?", (document_id,))
            db.commit()
        finally:
            db.close()
