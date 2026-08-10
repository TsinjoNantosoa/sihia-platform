from pathlib import Path

from app.presentation.deps import rag_services


if __name__ == "__main__":
    path = Path(__file__).resolve().parents[1] / "data" / "chatbot_knowledge.json"
    try:
        document = rag_services.ingestion.import_legacy_json(path)
        print(f"Imported {document['id']} ({document['chunk_count']} chunks)")
    except Exception as exc:
        raise SystemExit(f"Legacy knowledge import failed: {exc}") from exc
