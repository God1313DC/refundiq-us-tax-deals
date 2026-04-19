from __future__ import annotations

import re

from app.schemas import ExtractedField


def _extract_currency(text: str, label: str) -> float | None:
    pattern = re.compile(label + r"[:\s]*\$?([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


class FieldExtractor:
    """Very small deterministic parser stub for demo and extension."""

    def extract(self, *, document_id: str, form_type: str, text: str) -> list[ExtractedField]:
        text = text or ""
        fields: list[ExtractedField] = []

        parser_rules = {
            "w2": [
                ("wages", "wages"),
                ("federal_withholding", "federal withholding"),
                ("state_wages", "state wages"),
                ("state_withholding", "state withholding"),
            ],
            "1099_nec": [("nonemployee_compensation", "nonemployee compensation")],
            "1099_misc": [("misc_income", "other income")],
            "1099_int": [("interest_income", "interest income")],
            "1099_div": [("dividend_income", "ordinary dividends")],
            "1098_t": [
                ("tuition_paid", "qualified tuition"),
                ("scholarships", "scholarships"),
            ],
            "1098_mortgage": [("mortgage_interest", "mortgage interest")],
        }

        for field_name, label in parser_rules.get(form_type, []):
            value = _extract_currency(text, label)
            if value is not None:
                confidence = 0.9 if label.lower() in text.lower() else 0.78
                fields.append(
                    ExtractedField(
                        name=field_name,
                        value=value,
                        source_document_id=document_id,
                        source_label=label,
                        confidence=confidence,
                        normalization_target=field_name,
                    )
                )

        return fields
