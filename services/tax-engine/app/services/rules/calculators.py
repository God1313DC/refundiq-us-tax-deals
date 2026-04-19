from __future__ import annotations

from app.schemas import AssumptionRecord, WarningRecord
from app.services.rules.constants import FEDERAL_BRACKETS_2025


def compute_progressive_tax(taxable_income: float, filing_status: str) -> float:
    brackets = FEDERAL_BRACKETS_2025[filing_status]
    tax = 0.0
    previous_limit = 0.0

    for limit, rate in brackets:
        if taxable_income <= previous_limit:
            break
        taxable_band = min(taxable_income, limit) - previous_limit
        tax += taxable_band * rate
        previous_limit = limit

    return round(max(tax, 0.0), 2)


def estimate_state_tax(state_of_residence: str, taxable_base: float) -> float:
    if state_of_residence.lower() in {"texas", "florida", "nevada", "washington"}:
        return 0.0
    return round(max(taxable_base - 4000, 0) * 0.03, 2)


def compute_education_credit(tuition_paid: float, scholarships: float) -> float:
    if tuition_paid <= 0:
        return 0.0
    net_qualified = max(tuition_paid - scholarships, 0)
    return round(min(net_qualified * 0.2, 2000), 2)


def compute_self_employment_tax(net_nonemployee_income: float) -> float:
    if net_nonemployee_income <= 0:
        return 0.0
    return round(net_nonemployee_income * 0.9235 * 0.153, 2)


def analyze_withholding(total_tax: float, withholding: float) -> tuple[list[WarningRecord], list[AssumptionRecord]]:
    warnings: list[WarningRecord] = []
    assumptions: list[AssumptionRecord] = []

    assumptions.append(
        AssumptionRecord(
            code="withholding-known-docs-only",
            label="Withholding uses available source documents",
            detail="Withholding analysis is limited to currently uploaded wage and income statements.",
        )
    )

    if withholding < total_tax * 0.8:
        warnings.append(
            WarningRecord(
                code="low-withholding",
                severity="warning",
                message="Withholding appears low relative to the current estimated federal tax.",
                action="Verify payroll withholding, supplemental withholding, and any estimated tax payments.",
            )
        )

    return warnings, assumptions
