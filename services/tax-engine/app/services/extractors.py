from __future__ import annotations

import re

from app.schemas import ExtractedField


AMOUNT_PATTERN = r"([0-9,]+(?:\.[0-9]{1,2})?)"


def _extract_currency(text: str, label: str) -> float | None:
    pattern = re.compile(
        re.escape(label) + r"(?:[^\d$]{0,40})\$?([0-9,]+(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def _parse_amount(raw: str) -> float:
    return float(raw.replace(",", ""))


def _append_field(
    fields: list[ExtractedField],
    *,
    document_id: str,
    name: str,
    value: float,
    label: str,
    confidence: float = 0.92,
) -> None:
    fields.append(
        ExtractedField(
            name=name,
            value=value,
            source_document_id=document_id,
            source_label=label,
            confidence=confidence,
            normalization_target=name,
        )
    )


def _normalize_w2_text(text: str) -> str:
    normalized = text.replace("\xa0", " ")
    normalized = re.sub(r"XXX-XX-\d{4}", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(\d+\.\d{2})(\d+\.\d{2})", r"\1 \2", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _extract_w2_fields(document_id: str, text: str) -> list[ExtractedField]:
    normalized = _normalize_w2_text(text)
    fields: list[ExtractedField] = []
    wages_value: float | None = None

    primary_pattern = re.search(
        rf"1\s*Wages,\s*tips,\s*other\s*compensation\s*2\s*Federal\s*income\s*tax\s*withheld\s*{AMOUNT_PATTERN}\s*{AMOUNT_PATTERN}",
        normalized,
        re.IGNORECASE,
    )
    if primary_pattern:
        wages_value = _parse_amount(primary_pattern.group(1))
        _append_field(
            fields,
            document_id=document_id,
            name="wages",
            value=wages_value,
            label="box 1 wages",
        )
        _append_field(
            fields,
            document_id=document_id,
            name="federal_withholding",
            value=_parse_amount(primary_pattern.group(2)),
            label="box 2 federal withholding",
        )

    state_block = re.search(
        r"16\s*State\s*wages,\s*tips,\s*etc\.\s*17\s*State\s*income\s*tax.*?20\s*Locality\s*name(.*?)(?:Form\s*W-2|Copy\s*2|Department of the Treasury)",
        normalized,
        re.IGNORECASE,
    )
    if state_block:
        decimal_amounts = [_parse_amount(value) for value in re.findall(r"\d+\.\d{2}", state_block.group(1))]
        if len(decimal_amounts) >= 2:
            if wages_value is not None:
                state_wages_value = min(decimal_amounts, key=lambda value: abs(value - wages_value))
            else:
                state_wages_value = max(decimal_amounts)

            remaining_amounts = [value for value in decimal_amounts if value != state_wages_value]
            state_withholding_value = next(
                (value for value in remaining_amounts if 0 <= value <= max(state_wages_value, 1.0)),
                remaining_amounts[0] if remaining_amounts else 0.0,
            )
            _append_field(
                fields,
                document_id=document_id,
                name="state_wages",
                value=state_wages_value,
                label="box 16 state wages",
            )
            _append_field(
                fields,
                document_id=document_id,
                name="state_withholding",
                value=state_withholding_value,
                label="box 17 state withholding",
            )

    if not fields:
        fallback_pattern = re.search(
            rf"Taxable\s*Wages.*?{AMOUNT_PATTERN}.*?Box\s*1\s*of\s*W-2\s*{AMOUNT_PATTERN}",
            normalized,
            re.IGNORECASE,
        )
        if fallback_pattern:
            _append_field(
                fields,
                document_id=document_id,
                name="wages",
                value=_parse_amount(fallback_pattern.group(1)),
                label="taxable wages summary",
                confidence=0.8,
            )
            _append_field(
                fields,
                document_id=document_id,
                name="federal_withholding",
                value=_parse_amount(fallback_pattern.group(2)),
                label="box 1/2 summary block",
                confidence=0.76,
            )

    return fields


class FieldExtractor:
    """Very small deterministic parser stub for demo and extension."""

    def extract(self, *, document_id: str, form_type: str, text: str) -> list[ExtractedField]:
        text = text or ""
        fields: list[ExtractedField] = []

        if form_type == "w2":
            return _extract_w2_fields(document_id, text)

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
