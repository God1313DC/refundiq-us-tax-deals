from __future__ import annotations

from collections import defaultdict
from hashlib import sha256

from app.schemas import ClassifiedDocument


def detect_duplicates(documents: list[ClassifiedDocument]) -> list[ClassifiedDocument]:
    seen_by_signature: dict[str, list[str]] = defaultdict(list)

    for document in documents:
        signature = build_document_signature(document)
        seen_by_signature[signature].append(document.document_id)

    for document in documents:
        signature = build_document_signature(document)
        if len(seen_by_signature[signature]) > 1 and document.form_type not in {"id_document", "prior_year_return"}:
            related_ids = [doc_id for doc_id in seen_by_signature[signature] if doc_id != document.document_id]
            document.conflicts_with = related_ids
            document.duplicate_of = related_ids[0] if related_ids else None

    return documents


def build_document_signature(document: ClassifiedDocument) -> str:
    field_pairs = [
        f"{field.name}:{field.value}"
        for field in sorted(document.extracted_fields, key=lambda item: item.name)
        if field.value is not None
    ]
    raw = "|".join([document.form_type, document.file_name.lower(), *field_pairs])
    return sha256(raw.encode("utf-8")).hexdigest()
