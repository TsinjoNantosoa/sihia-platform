import pytest

from app.rag.chunking import RecursiveChunker
from app.rag.embeddings import EmbeddingProvider
from app.rag.ingestion import DocumentIngestionService, DuplicateDocumentError, document_checksum, safe_filename
from app.rag.parsers import DocumentParseError, parse_document
from app.rag.retrieval import HybridRetriever, LightweightReranker, build_context
from app.rag.types import KnowledgeChunk, ParsedSection, RetrievedChunk
from app.rag.vector_repository import MemoryVectorRepository
from fastapi.testclient import TestClient
from app.main import app
from app.presentation.deps import rag_services


class FakeEmbeddings(EmbeddingProvider):
    @property
    def dimensions(self): return 2
    def embed(self, texts):
        return [[1.0, 0.0] if "appointment" in text.lower() else [0.0, 1.0] for text in texts]


class FakeDocuments:
    def __init__(self, chunks): self.chunks = chunks
    def list_chunks(self, filters=None):
        filters = filters or {}
        return [chunk for chunk in self.chunks if all(getattr(chunk, key) == value for key, value in filters.items())]


class FakeIngestionDocuments:
    def __init__(self): self.records, self.chunks = {}, []
    def find_by_checksum(self, checksum):
        return next((row for row in self.records.values() if row["checksum"] == checksum), None)
    def create(self, document): self.records[document["id"]] = dict(document)
    def get(self, document_id): return self.records.get(document_id)
    def replace_chunks(self, document_id, chunks): self.chunks = list(chunks)
    def set_status(self, document_id, status, chunk_count=0, error=None):
        self.records[document_id].update(status=status, chunk_count=chunk_count, error_message=error)


def make_chunk(identifier="appointments", content="Book an appointment at reception", content_type="text/plain"):
    return KnowledgeChunk(identifier, identifier, content, 0, f"{identifier}.txt", "test", content_type, "abc")


def test_chunking_preserves_sections_and_overlap():
    chunks = RecursiveChunker(100, 20).chunk(
        [ParsedSection("Heading. " + "sentence with clinical context. " * 10, page_number=2, title="Care")],
        document_id="doc", filename="care.md", source="test", content_type="text/markdown", checksum="hash",
    )
    assert len(chunks) > 1
    assert all(chunk.page_number == 2 and chunk.section == "Care" for chunk in chunks)
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))


def test_hash_is_deterministic_and_filename_is_safe():
    assert document_checksum(b"same") == document_checksum(b"same")
    assert document_checksum(b"same") != document_checksum(b"different")
    assert safe_filename("../../unsafe?.txt") == "unsafe_.txt"


def test_complete_ingestion_and_duplicate_protection(tmp_path):
    documents = FakeIngestionDocuments()
    vectors = MemoryVectorRepository()
    service = DocumentIngestionService(
        documents, FakeEmbeddings(), vectors, RecursiveChunker(100, 20), tmp_path, 1024,
    )
    content = b"Appointment booking at reception. " * 8
    record = service.ingest(content, "guide.txt", "text/plain", created_by="admin")
    assert record["status"] == "ready"
    assert record["chunk_count"] > 1
    assert documents.chunks and vectors.rows
    assert list(tmp_path.glob(f"{record['id']}.*"))
    with pytest.raises(DuplicateDocumentError):
        service.ingest(content, "copy.txt", "text/plain")


def test_malformed_and_unsupported_documents():
    with pytest.raises(DocumentParseError): parse_document(b"", "file.exe", "application/octet-stream")
    with pytest.raises(DocumentParseError): parse_document(b"\xff", "file.txt", "text/plain")


def test_memory_vector_search_and_metadata_filter():
    vectors = MemoryVectorRepository()
    vectors.ensure_collection(2)
    a, b = make_chunk(), make_chunk("policy", "Privacy policy", "text/markdown")
    vectors.upsert([a, b], [[1, 0], [0, 1]])
    results = vectors.search([1, 0], 5, 0.5, {"content_type": "text/plain"})
    assert [result.chunk.id for result in results] == ["appointments"]


def test_hybrid_retrieval_reranking_citations_and_no_match():
    chunk = make_chunk()
    vectors = MemoryVectorRepository(); vectors.upsert([chunk], [[1, 0]])
    retriever = HybridRetriever(FakeEmbeddings(), vectors, FakeDocuments([chunk]), top_k=5, final_k=2, threshold=.2)
    results = retriever.retrieve("appointment")
    assert results and results[0].citation()["filename"] == "appointments.txt"
    assert "SOURCE 1" in build_context(results)
    assert retriever.retrieve("unrelated banana") == []


def test_reranker_prefers_exact_query_terms():
    weak = RetrievedChunk(make_chunk("weak", "hospital information"), .5)
    strong = RetrievedChunk(make_chunk("strong", "appointment appointment booking"), .5)
    ranked = LightweightReranker().rerank("appointment booking", [weak, strong])
    assert ranked[0].chunk.id == "strong"


def _headers(email="admin@sihia.health", password="admin123"):
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    return client, {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_ingestion_api_and_admin_rbac(monkeypatch):
    document = {
        "id": "doc-api", "filename": "guide.md", "source": "upload", "content_type": "text/markdown",
        "size_bytes": 12, "checksum": "abc", "status": "ready", "chunk_count": 1, "error_message": None,
        "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00",
    }
    monkeypatch.setattr(rag_services.ingestion, "ingest", lambda *args, **kwargs: document)
    admin_client, admin = _headers()
    response = admin_client.post(
        "/api/knowledge/documents", headers=admin,
        files={"file": ("guide.md", b"# Care guide", "text/markdown")},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "ready"

    staff_client, staff = _headers("staff@sihia.health", "staff123")
    forbidden = staff_client.post(
        "/api/knowledge/documents", headers=staff,
        files={"file": ("guide.md", b"# Care guide", "text/markdown")},
    )
    assert forbidden.status_code == 403


def test_ingestion_api_rejects_malformed_type():
    client, headers = _headers()
    response = client.post(
        "/api/knowledge/documents", headers=headers,
        files={"file": ("payload.exe", b"not executable", "application/octet-stream")},
    )
    assert response.status_code == 422
