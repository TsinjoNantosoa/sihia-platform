from __future__ import annotations

import re
import uuid

from app.rag.types import KnowledgeChunk, ParsedSection


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class RecursiveChunker:
    """Boundary-aware character chunker with deterministic overlap."""

    def __init__(self, size: int = 700, overlap: int = 100) -> None:
        if size < 100 or overlap < 0 or overlap >= size:
            raise ValueError("chunk size/overlap configuration is invalid")
        self.size = size
        self.overlap = overlap

    def _split(self, text: str) -> list[str]:
        if len(text) <= self.size:
            return [text] if text else []
        units = [u.strip() for u in re.split(r"(?<=\n)\n+|(?<=[.!?])\s+", text) if u.strip()]
        chunks: list[str] = []
        current = ""
        for unit in units:
            if len(unit) > self.size:
                words = unit.split()
                for word in words:
                    candidate = f"{current} {word}".strip()
                    if len(candidate) > self.size and current:
                        chunks.append(current)
                        current = current[-self.overlap :].lstrip() + " " + word
                    else:
                        current = candidate
                continue
            candidate = f"{current}\n\n{unit}".strip()
            if len(candidate) > self.size and current:
                chunks.append(current)
                prefix = current[-self.overlap :].lstrip()
                current = f"{prefix}\n\n{unit}".strip()
            else:
                current = candidate
        if current:
            chunks.append(current)
        return chunks

    def chunk(
        self,
        sections: list[ParsedSection],
        *,
        document_id: str,
        filename: str,
        source: str,
        content_type: str,
        checksum: str,
    ) -> list[KnowledgeChunk]:
        output: list[KnowledgeChunk] = []
        for section in sections:
            clean = normalize_text(section.text)
            for content in self._split(clean):
                index = len(output)
                output.append(KnowledgeChunk(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"sihia:{document_id}:{index}:{checksum}")),
                    document_id=document_id,
                    content=content,
                    chunk_index=index,
                    filename=filename,
                    source=source,
                    content_type=content_type,
                    checksum=checksum,
                    page_number=section.page_number,
                    section=section.title,
                ))
        return output
