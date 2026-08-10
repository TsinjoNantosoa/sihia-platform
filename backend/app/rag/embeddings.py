from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Any
import time

import httpx

from app.core.config import Settings


class EmbeddingError(RuntimeError):
    pass


class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def dimensions(self) -> int: ...

    @abstractmethod
    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def dimensions(self) -> int:
        return self.settings.embedding_dimensions

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        if not self.settings.openai_api_key:
            raise EmbeddingError("OPENAI_API_KEY is required for OpenAI embeddings")
        payload: dict[str, Any] = {
            "model": self.settings.embedding_model,
            "input": list(texts),
            "dimensions": self.dimensions,
        }
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = httpx.post(
                    f"{self.settings.openai_base_url.rstrip('/')}/embeddings",
                    headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
                    json=payload,
                    timeout=30.0,
                )
                if response.status_code not in {408, 429} and response.status_code < 500:
                    response.raise_for_status()  # permanent 4xx: do not retry
                    rows = sorted(response.json()["data"], key=lambda item: item["index"])
                    return [row["embedding"] for row in rows]
                last_error = httpx.HTTPStatusError("transient embedding error", request=response.request, response=response)
            except (httpx.TransportError, KeyError, TypeError) as exc:
                last_error = exc
            except httpx.HTTPStatusError as exc:
                raise EmbeddingError("Embedding provider rejected the request") from exc
            if attempt < 2:
                time.sleep(0.25 * (attempt + 1))
        raise EmbeddingError("Embedding provider request failed") from last_error


class LocalEmbeddingProvider(EmbeddingProvider):
    """Optional air-gapped FastEmbed provider (model downloaded/cached once)."""

    def __init__(self, settings: Settings) -> None:
        try:
            from fastembed import TextEmbedding
        except ImportError as exc:
            raise EmbeddingError("Local embeddings require the optional fastembed package") from exc
        self._model = TextEmbedding(model_name=settings.local_embedding_model)
        probe = list(self._model.embed(["dimension probe"]))[0]
        self._dimensions = len(probe)

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self._model.embed(list(texts))]


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    if settings.embedding_provider == "local":
        return LocalEmbeddingProvider(settings)
    if settings.embedding_provider != "openai":
        raise EmbeddingError(f"Unsupported embedding provider: {settings.embedding_provider}")
    return OpenAIEmbeddingProvider(settings)
