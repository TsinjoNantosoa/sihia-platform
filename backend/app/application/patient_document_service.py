"""Upload / liste / téléchargement de documents patients."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status

from app.application.use_cases import PatientsService
from app.domain.models import PatientDocument
from app.infrastructure.patient_document_repository import UPLOAD_ROOT, PatientDocumentRepository

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
}
MAX_BYTES = 8 * 1024 * 1024
ALLOWED_CATEGORIES = {"ordonnance", "radio", "compte_rendu", "assurance", "autre", "other"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^\w.\-]+", "_", base, flags=re.UNICODE).strip("._")
    return (cleaned or "document")[:120]


class PatientDocumentService:
    def __init__(
        self,
        patients: PatientsService,
        repo: PatientDocumentRepository | None = None,
    ) -> None:
        self.patients = patients
        self.repo = repo or PatientDocumentRepository()

    def list(self, patient_id: str) -> list[dict]:
        self.patients.get(patient_id)
        return [self._payload(d) for d in self.repo.list_for_patient(patient_id)]

    def upload(
        self,
        patient_id: str,
        *,
        filename: str,
        content_type: str,
        data: bytes,
        category: str = "other",
        notes: str | None = None,
        uploaded_by: str | None = None,
    ) -> dict:
        self.patients.get(patient_id)
        if not data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier vide")
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier trop volumineux (max 8 Mo)")
        ctype = (content_type or "application/octet-stream").split(";")[0].strip().lower()
        if ctype not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Type non autorisé: {ctype}. Autorisés: PDF, JPEG, PNG, WebP, TXT",
            )
        cat = (category or "other").strip().lower()
        if cat not in ALLOWED_CATEGORIES:
            cat = "other"

        doc_id = f"doc-{uuid4().hex[:12]}"
        safe_name = _safe_filename(filename)
        patient_dir = UPLOAD_ROOT / patient_id
        patient_dir.mkdir(parents=True, exist_ok=True)
        storage_name = f"{doc_id}_{safe_name}"
        storage_path = patient_dir / storage_name
        storage_path.write_bytes(data)

        doc = PatientDocument(
            id=doc_id,
            patient_id=patient_id,
            filename=safe_name,
            content_type=ctype,
            size_bytes=len(data),
            category=cat,
            storage_path=str(storage_path),
            uploaded_by=uploaded_by,
            uploaded_at=_utc_now(),
            notes=notes,
        )
        self.repo.create(doc)
        return self._payload(doc)

    def get_file(self, patient_id: str, document_id: str) -> tuple[PatientDocument, bytes]:
        self.patients.get(patient_id)
        doc = self.repo.get(document_id)
        if doc is None or doc.patient_id != patient_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable")
        path = Path(doc.storage_path)
        if not path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier manquant sur le disque")
        return doc, path.read_bytes()

    def delete(self, patient_id: str, document_id: str) -> None:
        self.patients.get(patient_id)
        doc = self.repo.get(document_id)
        if doc is None or doc.patient_id != patient_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable")
        path = Path(doc.storage_path)
        if path.is_file():
            path.unlink()
        self.repo.delete(document_id)

    def _payload(self, doc: PatientDocument) -> dict:
        return {
            "id": doc.id,
            "patientId": doc.patient_id,
            "filename": doc.filename,
            "contentType": doc.content_type,
            "sizeBytes": doc.size_bytes,
            "category": doc.category,
            "uploadedBy": doc.uploaded_by,
            "uploadedAt": doc.uploaded_at,
            "notes": doc.notes,
            "downloadUrl": f"/api/patients/{doc.patient_id}/documents/{doc.id}/download",
        }
