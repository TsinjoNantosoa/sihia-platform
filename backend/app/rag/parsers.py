from __future__ import annotations

import re
from pathlib import Path

from app.rag.types import ParsedSection


class DocumentParseError(ValueError):
    pass


def parse_document(content: bytes, filename: str, content_type: str) -> list[ParsedSection]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf" or content_type == "application/pdf":
        try:
            import fitz
        except ImportError as exc:
            raise DocumentParseError("PDF support requires PyMuPDF") from exc
        try:
            with fitz.open(stream=content, filetype="pdf") as document:
                sections = [
                    ParsedSection(text=page.get_text("text"), page_number=index + 1)
                    for index, page in enumerate(document)
                    if page.get_text("text").strip()
                ]
        except Exception as exc:
            raise DocumentParseError("Malformed or encrypted PDF") from exc
        if not sections:
            raise DocumentParseError("The PDF contains no extractable text")
        return sections
    if suffix not in {".txt", ".md", ".markdown"}:
        raise DocumentParseError("Unsupported document type")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise DocumentParseError("Text documents must use UTF-8 encoding") from exc
    if not text.strip():
        raise DocumentParseError("The document is empty")
    if suffix in {".md", ".markdown"}:
        sections: list[ParsedSection] = []
        title: str | None = None
        body: list[str] = []
        for line in text.splitlines():
            match = re.match(r"^#{1,6}\s+(.+)$", line)
            if match:
                if body and "\n".join(body).strip():
                    sections.append(ParsedSection("\n".join(body), title=title))
                title, body = match.group(1).strip(), []
            else:
                body.append(line)
        if body and "\n".join(body).strip():
            sections.append(ParsedSection("\n".join(body), title=title))
        return sections or [ParsedSection(text)]
    return [ParsedSection(text)]
