from __future__ import annotations

import re
from html import unescape

from bs4 import BeautifulSoup

from app.schemas import ParsedSourceContent, SourceCatalogEntry


DATE_PATTERNS = [
    r"Page Last Reviewed or Updated:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})",
    r"Page Last Reviewed or Updated:\s*([0-9]{1,2}-[A-Za-z]+-[0-9]{4})",
    r"Updated on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})",
]


def parse_html_source(entry: SourceCatalogEntry, html: str, checksum: str) -> ParsedSourceContent:
    soup = BeautifulSoup(html, "html.parser")
    title = _first_text(soup, ["h1"]) or (soup.title.string.strip() if soup.title and soup.title.string else entry.title)
    text_content = _collapse_text(soup.get_text(" ", strip=True))
    revision_date = _extract_revision_date(text_content)
    tax_year = _extract_tax_year(text_content) or entry.tax_year
    form_number = _extract_form_number(title) or entry.form_number
    publication_number = _extract_publication_number(title) or entry.publication_number
    topic_tags = sorted(set([*entry.topic_tags, *_derive_topic_tags(title, text_content)]))
    draft_only = entry.draft_only or "draft" in title.lower() or "draft" in entry.source_url.lower()

    return ParsedSourceContent(
        title=title,
        source_url=entry.source_url,
        source_type=entry.source_type,
        content_type="text/html",
        authority_type=entry.authority_type,
        authority_tier=entry.authority_tier,
        jurisdiction=entry.jurisdiction,
        revision_date=revision_date,
        tax_year=tax_year,
        form_number=form_number,
        publication_number=publication_number,
        topic_tags=topic_tags,
        draft_only=draft_only,
        checksum=checksum,
        text_content=text_content[:50000],
        extracted_summary=_build_summary(text_content, title, draft_only),
        metadata={"parser": "html", "scope_tag": entry.scope_tag},
        scope_tag=entry.scope_tag,
    )


def _collapse_text(text: str) -> str:
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _first_text(soup: BeautifulSoup, selectors: list[str]) -> str | None:
    for selector in selectors:
        match = soup.select_one(selector)
        if match:
            text = match.get_text(" ", strip=True)
            if text:
                return text
    return None


def _extract_revision_date(text: str) -> str | None:
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_tax_year(text: str) -> int | None:
    match = re.search(r"(Tax Year|tax year)\s+(20\d{2})", text)
    if match:
        return int(match.group(2))
    match = re.search(r"\b(20\d{2})\b", text)
    return int(match.group(1)) if match else None


def _extract_form_number(title: str) -> str | None:
    match = re.search(r"Form\s+([0-9A-Z-]+)", title, re.IGNORECASE)
    return match.group(1) if match else None


def _extract_publication_number(title: str) -> str | None:
    match = re.search(r"Publication\s+([0-9A-Z-]+)", title, re.IGNORECASE)
    return match.group(1) if match else None


def _derive_topic_tags(title: str, text: str) -> list[str]:
    haystack = f"{title} {text}".lower()
    tags: list[str] = []
    for candidate in [
        "education",
        "withholding",
        "standard-deduction",
        "mef",
        "quickalerts",
        "iris",
        "a2a",
        "tin-matching",
        "transcripts",
        "information-returns",
    ]:
        if candidate.replace("-", " ") in haystack or candidate in haystack:
            tags.append(candidate)
    return tags


def _build_summary(text: str, title: str, draft_only: bool) -> str:
    summary = text[:320].strip()
    if draft_only:
        return f"Draft-only source detected. {title}. {summary}"
    return f"{title}. {summary}"
