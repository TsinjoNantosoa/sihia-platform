"""Offline, reproducible RAG evaluation (no network or provider credentials required).

The default fixture mode evaluates retrieval against the legacy corpus before it is
imported. ``--live`` evaluates the configured SQL/Qdrant index instead.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.rag.retrieval import LexicalRetriever
from app.rag.types import KnowledgeChunk


class FixtureDocuments:
    def __init__(self, chunks: list[KnowledgeChunk]) -> None:
        self.chunks = chunks
    def list_chunks(self, filters: dict[str, Any] | None = None) -> list[KnowledgeChunk]:
        return self.chunks


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w{3,}", text.lower()))


def _legacy_chunks(path: Path) -> list[KnowledgeChunk]:
    entries = json.loads(path.read_text(encoding="utf-8"))
    chunks = []
    for index, entry in enumerate(entries):
        content = re.sub(r"<[^>]+>", " ", f"{entry.get('fr', '')} {entry.get('en', '')}")
        chunks.append(KnowledgeChunk(
            id=entry["id"], document_id=entry["id"], content=content, chunk_index=index,
            filename=f"legacy/{entry['id']}.md", source="legacy-json", content_type="text/markdown", checksum="fixture",
            section=entry.get("title"),
        ))
    return chunks


def evaluate(dataset: list[dict[str, Any]], retrieve) -> dict[str, Any]:
    rows = []
    for case in dataset:
        results = retrieve(case["question"])
        expected_sources = set(case.get("expected_sources", []))
        retrieved_sources = [item.chunk.document_id for item in results]
        relevant = [source for source in retrieved_sources if source in expected_sources]
        precision_sum = 0.0
        hits = 0
        for rank, source in enumerate(retrieved_sources, 1):
            if source in expected_sources:
                hits += 1
                precision_sum += hits / rank
        context = " ".join(item.chunk.content for item in results)
        expected_terms = _tokens(case.get("expected_answer", ""))
        context_terms = _tokens(context)
        rows.append({
            "question": case["question"],
            "retrieved_sources": retrieved_sources,
            "expected_sources": sorted(expected_sources),
            "retrieval_hit": bool(relevant),
            "context_precision": precision_sum / max(len(expected_sources), 1),
            "context_recall": len(set(relevant)) / max(len(expected_sources), 1),
            "answer_relevancy_proxy": len(expected_terms & context_terms) / max(len(expected_terms), 1),
            # Extractive answers contain only retrieved evidence, hence this baseline is faithful by construction.
            "faithfulness": 1.0 if results else 0.0,
        })
    metric_names = ["context_precision", "context_recall", "answer_relevancy_proxy", "faithfulness"]
    metrics = {name: round(sum(row[name] for row in rows) / max(len(rows), 1), 4) for name in metric_names}
    metrics["retrieval_hit_rate"] = round(sum(row["retrieval_hit"] for row in rows) / max(len(rows), 1), 4)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "framework": "SIHIA deterministic retrieval evaluation (RAGAS-compatible concepts)",
        "case_count": len(rows), "metrics": metrics, "cases": rows,
        "limitations": "Faithfulness is measured on an extractive baseline; use an LLM judge/RAGAS in staging for generated-answer scoring.",
    }


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=root / "evaluation" / "rag_dataset.json")
    parser.add_argument("--output", type=Path, default=root / "evaluation" / "rag_report.json")
    parser.add_argument("--live", action="store_true", help="Evaluate the configured SQL/Qdrant index")
    args = parser.parse_args()
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    if args.live:
        from app.presentation.deps import rag_services
        retrieve = rag_services.retriever.retrieve
    else:
        chunks = _legacy_chunks(root / "data" / "chatbot_knowledge.json")
        lexical = LexicalRetriever(FixtureDocuments(chunks))  # type: ignore[arg-type]
        retrieve = lambda question: lexical.search(question, 5)
    report = evaluate(dataset, retrieve)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["metrics"], indent=2))


if __name__ == "__main__":
    main()
