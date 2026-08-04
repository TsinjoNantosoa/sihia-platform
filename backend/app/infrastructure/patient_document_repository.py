"""Persistance des documents patients (métadonnées + fichiers locaux)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.domain.models import PatientDocument
from app.infrastructure.database import connect

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "data" / "uploads" / "patients"


def _row_to_doc(row: dict[str, Any]) -> PatientDocument:
    return PatientDocument(
        id=row["id"],
        patient_id=row["patient_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        size_bytes=int(row["size_bytes"]),
        category=row["category"],
        storage_path=row["storage_path"],
        uploaded_by=row.get("uploaded_by"),
        uploaded_at=row["uploaded_at"],
        notes=row.get("notes"),
    )


class PatientDocumentRepository:
    def list_for_patient(self, patient_id: str) -> list[PatientDocument]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM patient_documents WHERE patient_id=? ORDER BY uploaded_at DESC",
            (patient_id,),
        ).fetchall()
        conn.close()
        return [_row_to_doc(r) for r in rows]

    def get(self, document_id: str) -> PatientDocument | None:
        conn = connect()
        row = conn.execute(
            "SELECT * FROM patient_documents WHERE id=?",
            (document_id,),
        ).fetchone()
        conn.close()
        return _row_to_doc(row) if row else None

    def create(self, doc: PatientDocument) -> PatientDocument:
        conn = connect()
        conn.execute(
            """
            INSERT INTO patient_documents
            (id, patient_id, filename, content_type, size_bytes, category, storage_path, uploaded_by, uploaded_at, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """,
            (
                doc.id,
                doc.patient_id,
                doc.filename,
                doc.content_type,
                doc.size_bytes,
                doc.category,
                doc.storage_path,
                doc.uploaded_by,
                doc.uploaded_at,
                doc.notes,
            ),
        )
        conn.commit()
        conn.close()
        return doc

    def delete(self, document_id: str) -> None:
        conn = connect()
        conn.execute("DELETE FROM patient_documents WHERE id=?", (document_id,))
        conn.commit()
        conn.close()
