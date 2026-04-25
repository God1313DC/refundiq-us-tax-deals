from __future__ import annotations

from app.schemas import UploadedDocument


class DocumentClassifier:
    """Simple rule-based classifier stub for the MVP.

    Future versions can call an ML or LLM-assisted classifier, but classification
    should remain observable and reviewable.
    """

    def classify(self, document: UploadedDocument) -> tuple[str, float]:
        name = document.file_name.lower()
        text = (document.content_text or "").lower()
        if document.declared_form_type and document.declared_form_type not in {"supporting_document", "unclassified"}:
            return document.declared_form_type, 0.96

        mappings = {
            "w-2": "w2",
            "1099-nec": "1099_nec",
            "1099-misc": "1099_misc",
            "1099-int": "1099_int",
            "1099-div": "1099_div",
            "1098-t": "1098_t",
            "1098": "1098_mortgage",
            "return": "prior_year_return",
            "license": "id_document",
            "passport": "id_document",
        }

        for pattern, form_type in mappings.items():
            if pattern in name or pattern in text:
                return form_type, 0.91

        text_heuristics = {
            "box 1 wages": "w2",
            "nonemployee compensation": "1099_nec",
            "ordinary dividends": "1099_div",
            "interest income": "1099_int",
            "qualified tuition": "1098_t",
            "mortgage interest received": "1098_mortgage",
        }
        for pattern, form_type in text_heuristics.items():
            if pattern in text:
                return form_type, 0.78

        if document.mime_type.startswith("image/"):
            return "unknown_image", 0.45

        return "unclassified", 0.35
