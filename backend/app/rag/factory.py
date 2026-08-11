from pathlib import Path

from app.core.config import Settings
from app.rag.chunking import RecursiveChunker
from app.rag.document_repository import KnowledgeDocumentRepository
from app.rag.embeddings import build_embedding_provider
from app.rag.ingestion import DocumentIngestionService
from app.rag.retrieval import HybridRetriever, build_reranker
from app.rag.vector_repository import QdrantVectorRepository


class RAGServices:
    def __init__(self, settings: Settings) -> None:
        self.documents = KnowledgeDocumentRepository()
        self.embeddings = build_embedding_provider(settings)
        self.vectors = QdrantVectorRepository(settings)
        self.retriever = HybridRetriever(
            self.embeddings, self.vectors, self.documents,
            top_k=settings.rag_top_k, final_k=settings.rag_final_k,
            threshold=settings.rag_score_threshold, hybrid_enabled=settings.rag_hybrid_enabled,
            rerank_enabled=settings.rag_rerank_enabled,
            reranker=build_reranker(settings.rag_reranker, settings.rag_rerank_model),
        )
        storage = Path(__file__).resolve().parents[2] / "data" / "knowledge"
        self.ingestion = DocumentIngestionService(
            self.documents, self.embeddings, self.vectors,
            RecursiveChunker(settings.rag_chunk_size, settings.rag_chunk_overlap),
            storage, settings.rag_max_upload_mb * 1024 * 1024,
        )
