"""Reproducible retrieval benchmark and opt-in RAGAS answer evaluation."""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from app.rag.retrieval import LexicalRetriever
from app.rag.types import KnowledgeChunk, RetrievedChunk


class FixtureDocuments:
    def __init__(self, chunks: list[KnowledgeChunk]) -> None:
        self.chunks = chunks

    def list_chunks(self, filters: dict[str, Any] | None = None) -> list[KnowledgeChunk]:
        return self.chunks


def _legacy_chunks(path: Path) -> list[KnowledgeChunk]:
    entries = json.loads(path.read_text(encoding="utf-8"))
    return [
        KnowledgeChunk(
            id=entry["id"], document_id=entry["id"],
            content=re.sub(r"<[^>]+>", " ", f"{entry.get('fr', '')} {entry.get('en', '')}"),
            chunk_index=index, filename=f"legacy/{entry['id']}.md", source="legacy-json",
            content_type="text/markdown", checksum="fixture", section=entry.get("title"),
        )
        for index, entry in enumerate(entries)
    ]


def retrieval_question(case: dict[str, Any]) -> str:
    previous = str(case.get("previous_question", "")).strip()
    return f"{previous}\nFollow-up: {case['question']}" if previous else case["question"]


def evaluate_retrieval(
    dataset: list[dict[str, Any]],
    retrieve: Callable[[str], list[RetrievedChunk]],
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for case in dataset:
        results = retrieve(retrieval_question(case))
        expected = list(dict.fromkeys(case.get("expected_sources", [])))
        expected_set = set(expected)
        retrieved = list(dict.fromkeys(item.chunk.document_id for item in results))
        relevant = [source for source in retrieved if source in expected_set]
        no_answer = not expected
        reciprocal_rank = next((1 / rank for rank, source in enumerate(retrieved, 1) if source in expected_set), 0.0)
        rows.append({
            "id": case.get("id"),
            "category": case.get("category", "uncategorized"),
            "question": case["question"],
            "expected_sources": expected,
            "retrieved_sources": retrieved,
            "hit_at_k": (not retrieved) if no_answer else bool(relevant),
            "no_answer_correct": (not retrieved) if no_answer else None,
            "precision_at_k": (1.0 if not retrieved else 0.0) if no_answer else len(relevant) / max(len(retrieved), 1),
            "recall_at_k": (1.0 if not retrieved else 0.0) if no_answer else len(relevant) / len(expected),
            "reciprocal_rank": 1.0 if no_answer and not retrieved else reciprocal_rank,
        })
    names = ("hit_at_k", "precision_at_k", "recall_at_k", "reciprocal_rank")
    metrics = {name: round(sum(float(row[name]) for row in rows) / max(len(rows), 1), 4) for name in names}
    no_answer_rows = [row for row in rows if row["no_answer_correct"] is not None]
    metrics["no_answer_accuracy"] = round(
        sum(bool(row["no_answer_correct"]) for row in no_answer_rows) / max(len(no_answer_rows), 1), 4
    )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "retrieval",
        "framework": "SIHIA deterministic retrieval benchmark",
        "case_count": len(rows),
        "metrics": metrics,
        "cases": rows,
    }


def evaluate_generated_answers(dataset: list[dict[str, Any]]) -> dict[str, Any]:
    """Generate real SIHIA answers, then score them with RAGAS and an evaluator LLM."""
    try:
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        from ragas import EvaluationDataset, evaluate
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from ragas.llms import LangchainLLMWrapper
        from ragas.metrics import (
            Faithfulness,
            FactualCorrectness,
            LLMContextPrecisionWithReference,
            LLMContextRecall,
            ResponseRelevancy,
        )
    except ImportError as exc:
        raise RuntimeError("Install requirements-eval.txt before using --generated") from exc

    from app.core.config import settings
    from app.presentation.deps import chatbot_service

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for --generated")
    samples: list[dict[str, Any]] = []
    source_rows: list[dict[str, Any]] = []
    for case in dataset:
        generated = chatbot_service.generate_for_evaluation(
            case["question"], lang=case.get("lang", "fr"),
            previous_question=case.get("previous_question", ""),
        )
        samples.append({
            "user_input": case["question"],
            "retrieved_contexts": generated["retrieved_contexts"],
            "response": re.sub(r"<[^>]+>", " ", generated["response"]).strip(),
            "reference": case["expected_answer"],
        })
        retrieved_ids = list(dict.fromkeys(
            str(source.get("document_id", "")) for source in generated["sources"] if source.get("document_id")
        ))
        expected_ids = set(case.get("expected_sources", []))
        source_rows.append({
            "id": case.get("id"),
            "expected_source_ids": sorted(expected_ids),
            "retrieved_source_ids": retrieved_ids,
            "source_hit": (not retrieved_ids) if not expected_ids else bool(expected_ids.intersection(retrieved_ids)),
            "source_recall": (
                1.0 if not expected_ids and not retrieved_ids
                else len(expected_ids.intersection(retrieved_ids)) / max(len(expected_ids), 1)
            ),
        })

    evaluator_llm = LangchainLLMWrapper(ChatOpenAI(
        model=settings.openai_model, api_key=settings.openai_api_key,
        base_url=settings.openai_base_url, temperature=0,
    ))
    evaluator_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(
        model=settings.embedding_model, api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    ))
    result = evaluate(
        dataset=EvaluationDataset.from_list(samples),
        metrics=[
            Faithfulness(llm=evaluator_llm),
            FactualCorrectness(llm=evaluator_llm),
            LLMContextPrecisionWithReference(llm=evaluator_llm),
            LLMContextRecall(llm=evaluator_llm),
            ResponseRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings),
        ],
    )
    metrics = dict(result)
    metrics["source_hit_rate"] = round(sum(row["source_hit"] for row in source_rows) / len(source_rows), 4)
    metrics["source_recall"] = round(sum(row["source_recall"] for row in source_rows) / len(source_rows), 4)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "generated-answer",
        "framework": "RAGAS",
        "case_count": len(samples),
        "metrics": metrics,
        "cases": result.to_pandas().to_dict(orient="records"),
        "source_cases": source_rows,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=root / "evaluation" / "rag_dataset.json")
    parser.add_argument("--output", type=Path, default=root / "reports" / "rag_evaluation_latest.json")
    parser.add_argument("--live", action="store_true", help="Use the configured SQL/Qdrant retrieval index")
    parser.add_argument("--generated", action="store_true", help="Generate answers and run RAGAS (network/cost)")
    parser.add_argument("--limit", type=int, default=0, help="Evaluate only the first N cases")
    args = parser.parse_args()
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    if args.limit:
        dataset = dataset[: args.limit]
    if args.generated:
        report = evaluate_generated_answers(dataset)
    else:
        if args.live:
            from app.presentation.deps import rag_services
            retrieve = rag_services.retriever.retrieve
        else:
            lexical = LexicalRetriever(FixtureDocuments(_legacy_chunks(root / "data" / "chatbot_knowledge.json")))  # type: ignore[arg-type]
            retrieve = lambda question: lexical.search(question, 5)
        report = evaluate_retrieval(dataset, retrieve)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(report["metrics"], indent=2, default=str))


if __name__ == "__main__":
    main()
