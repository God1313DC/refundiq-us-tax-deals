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


def compute_education_credit(
    tuition_paid: float,
    scholarships: float,
    filing_status: str,
    modified_adjusted_gross_income: float,
    has_1098_t_support: bool,
) -> float:
    if tuition_paid <= 0 or not has_1098_t_support or filing_status == "married_filing_separately":
        return 0.0

    net_qualified = max(tuition_paid - scholarships, 0)
    if net_qualified <= 0:
        return 0.0

    tentative_credit = min(net_qualified, 2000) + min(max(net_qualified - 2000, 0), 2000) * 0.25
    phaseout_start = 160000 if filing_status == "married_filing_jointly" else 80000
    phaseout_end = 180000 if filing_status == "married_filing_jointly" else 90000

    if modified_adjusted_gross_income >= phaseout_end:
        return 0.0

    if modified_adjusted_gross_income > phaseout_start:
        reduction_ratio = (phaseout_end - modified_adjusted_gross_income) / (phaseout_end - phaseout_start)
        tentative_credit *= max(reduction_ratio, 0)

    return round(min(tentative_credit, 2500), 2)


def compute_self_employment_tax(net_nonemployee_income: float) -> float:
    if net_nonemployee_income <= 0:
        return 0.0
    return round(net_nonemployee_income * 0.9235 * 0.153, 2)


def compute_deductible_half_self_employment_tax(self_employment_tax: float) -> float:
    return round(max(self_employment_tax, 0) * 0.5, 2)


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

    if total_tax > 0 and withholding > total_tax * 1.15:
        warnings.append(
            WarningRecord(
                code="high-withholding",
                severity="info",
                message="Withholding currently appears higher than the estimated federal tax position.",
                action="Confirm year-end withholding and refundable credits during preparer review.",
            )
        )

    return warnings, assumptions
