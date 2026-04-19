from __future__ import annotations

import re
from io import BytesIO

from pypdf import PdfReader

from app.schemas import ParsedSourceContent, SourceCatalogEntry


def parse_pdf_source(entry: SourceCatalogEntry, content: bytes, checksum: str) -> ParsedSourceContent:
    title = entry.title
    text_chunks: list[str] = []
    metadata: dict[str, str] = {}
    try:
        reader = PdfReader(BytesIO(content))
        if reader.metadata:
            metadata = {str(key): str(value) for key, value in dict(reader.metadata).items()}
            title = metadata.get("/Title") or title
        for page in reader.pages[:3]:
            text_chunks.append(page.extract_text() or "")
    except Exception:
        text_chunks.append(content[:2000].decode("utf-8", errors="ignore"))

    text_content = re.sub(r"\s+", " ", " ".join(text_chunks)).strip()
    revision_date = _extract_revision_date(text_content)
    tax_year = _extract_tax_year(text_content) or entry.tax_year
    draft_only = entry.draft_only or "draft" in title.lower()

    return ParsedSourceContent(
        title=title,
        source_url=entry.source_url,
        source_type=entry.source_type,
        content_type="application/pdf",
        authority_type=entry.authority_type,
        authority_tier=entry.authority_tier,
        jurisdiction=entry.jurisdiction,
        revision_date=revision_date,
        tax_year=tax_year,
        form_number=entry.form_number,
        publication_number=entry.publication_number,
        topic_tags=entry.topic_tags,
        draft_only=draft_only,
        checksum=checksum,
        text_content=text_content[:50000],
        extracted_summary=f"{title}. {text_content[:320]}",
        metadata={"parser": "pdf", **metadata, "scope_tag": entry.scope_tag},
        scope_tag=entry.scope_tag,
    )


def _extract_revision_date(text: str) -> str | None:
    match = re.search(r"([A-Za-z]+\s+\d{1,2},\s+\d{4})", text)
    return match.group(1) if match else None


def _extract_tax_year(text: str) -> int | None:
    match = re.search(r"(Tax Year|tax year)\s+(20\d{2})", text)
    if match:
        return int(match.group(2))
    match = re.search(r"\b(20\d{2})\b", text)
    return int(match.group(1)) if match else None
