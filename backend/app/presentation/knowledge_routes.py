from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.infrastructure.audit_log import append_audit_record
from app.presentation.deps import rag_services, require_permission
from app.rag.ingestion import DuplicateDocumentError
from app.rag.parsers import DocumentParseError
from app.rag.vector_repository import VectorStoreError

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def _clean(document: dict) -> dict:
    return {
        "id": document["id"], "filename": document["filename"], "source": document["source"],
        "content_type": document["content_type"], "size_bytes": document["size_bytes"],
        "checksum": document["checksum"], "status": document["status"], "chunk_count": document["chunk_count"],
        "error_message": document["error_message"], "created_at": document["created_at"], "updated_at": document["updated_at"],
    }


@router.get("/documents")
def list_documents(_claims: dict = Depends(require_permission("users:read"))):
    items = [_clean(item) for item in rag_services.documents.list()]
    return {"items": items, "count": len(items)}


@router.get("/documents/{document_id}")
def get_document(document_id: str, _claims: dict = Depends(require_permission("users:read"))):
    document = rag_services.documents.get(document_id)
    if not document:
        raise HTTPException(404, "Document introuvable")
    return _clean(document)


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    claims: dict = Depends(require_permission("users:create")),
):
    content = await file.read(rag_services.ingestion.max_upload_bytes + 1)
    try:
        document = rag_services.ingestion.ingest(
            content, file.filename or "document", file.content_type or "application/octet-stream",
            created_by=str(claims.get("sub", "")),
        )
    except DuplicateDocumentError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "DUPLICATE_DOCUMENT", "message": str(exc), "details": _clean(exc.document)}) from exc
    except DocumentParseError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except (VectorStoreError, RuntimeError) as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Knowledge indexing is temporarily unavailable") from exc
    append_audit_record({
        "event": "admin_action", "action": "knowledge.document.upload", "actor_id": claims.get("sub"),
        "target_id": document["id"], "correlation_id": getattr(request.state, "correlation_id", None),
    })
    return _clean(document)


@router.post("/documents/{document_id}/reindex")
def reindex_document(document_id: str, _claims: dict = Depends(require_permission("users:update"))):
    try:
        return _clean(rag_services.ingestion.reindex(document_id))
    except KeyError as exc:
        raise HTTPException(404, "Document introuvable") from exc
    except FileNotFoundError as exc:
        raise HTTPException(409, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(503, "Réindexation indisponible") from exc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, _claims: dict = Depends(require_permission("users:delete"))):
    try:
        rag_services.ingestion.delete(document_id)
    except KeyError as exc:
        raise HTTPException(404, "Document introuvable") from exc
    except VectorStoreError as exc:
        raise HTTPException(503, "Vector store unavailable; document was not deleted") from exc
