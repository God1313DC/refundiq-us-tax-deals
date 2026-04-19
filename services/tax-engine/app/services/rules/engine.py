from __future__ import annotations

from datetime import datetime, timezone

from app.config import settings
from app.schemas import CitationRecord, ConfidenceReason, EstimateLineItem, EstimateResult, NormalizedTaxProfile
from app.services.insights import build_client_insights, build_internal_insights
from app.services.rules.calculators import (
    analyze_withholding,
    compute_education_credit,
    compute_progressive_tax,
    compute_self_employment_tax,
    estimate_state_tax,
)
from app.services.rules.constants import IRS_CITATIONS, STANDARD_DEDUCTIONS_2025


class TaxEstimator:
    """Deterministic, explainable estimator for limited-scope 1040 scenarios."""

    def run(self, profile: NormalizedTaxProfile) -> EstimateResult:
        gross_income = (
            profile.wages
            + profile.interest_income
            + profile.dividend_income
            + profile.misc_income
            + profile.nonemployee_compensation
        )

        standard_deduction = STANDARD_DEDUCTIONS_2025[profile.filing_status]
        taxable_income = max(gross_income - standard_deduction, 0)
        federal_income_tax = compute_progressive_tax(taxable_income, profile.filing_status)

        net_nonemployee_income = max(
            profile.nonemployee_compensation - profile.self_employment_expenses, 0
        )
        self_employment_tax = compute_self_employment_tax(net_nonemployee_income)
        education_credit = compute_education_credit(profile.tuition_paid, profile.scholarships)

        total_federal_tax = federal_income_tax + self_employment_tax - education_credit
        withholding_warnings, withholding_assumptions = analyze_withholding(
            total_federal_tax, profile.federal_withholding
        )
        total_warning_details = [*profile.warning_details, *withholding_warnings]
        total_assumption_details = [*profile.assumptions_detail, *withholding_assumptions]

        estimated_federal = round(profile.federal_withholding - total_federal_tax, 2)

        state_taxable_base = (
            profile.wages
            + profile.interest_income
            + profile.dividend_income
            + profile.misc_income
            + net_nonemployee_income
        )
        state_tax = estimate_state_tax(profile.state_of_residence, state_taxable_base)
        estimated_state = round(profile.state_withholding - state_tax, 2)

        line_items = [
            EstimateLineItem(
                label="Gross income",
                amount=gross_income,
                category="income",
                note="Includes W-2 wages and supported simple 1099 income categories.",
            ),
            EstimateLineItem(
                label="Standard deduction",
                amount=-standard_deduction,
                category="deduction",
                note="2025 standard deduction by filing status.",
            ),
            EstimateLineItem(
                label="Taxable income",
                amount=taxable_income,
                category="adjustment",
                note="Gross income less standard deduction.",
            ),
            EstimateLineItem(
                label="Estimated federal income tax",
                amount=-federal_income_tax,
                category="tax",
                note="Deterministic bracket calculation using current 2025 configuration.",
            ),
            EstimateLineItem(
                label="Estimated self-employment tax",
                amount=-self_employment_tax,
                category="tax",
                note="Applied only when nonemployee compensation remains after supported expense offsets.",
            ),
            EstimateLineItem(
                label="Estimated education credit",
                amount=education_credit,
                category="credit",
                note="Limited-scope placeholder credit requires reviewer confirmation.",
            ),
            EstimateLineItem(
                label="Federal withholding",
                amount=profile.federal_withholding,
                category="withholding",
                note="Based on currently normalized source documents only.",
            ),
            EstimateLineItem(
                label="Estimated state tax position",
                amount=estimated_state,
                category="tax",
                note="Modular state estimate path with conservative placeholder logic.",
            ),
        ]

        confidence = "high"
        confidence_reasons = [
            ConfidenceReason(
                label="Structured document coverage",
                impact="positive",
                detail="Confidence improves when core income and withholding documents are present.",
            )
        ]

        if profile.missing_items:
            confidence = "medium"
            confidence_reasons.append(
                ConfidenceReason(
                    label="Missing documents",
                    impact="negative",
                    detail="Required income or support documents are still missing from the case.",
                )
            )

        if len(profile.missing_items) >= 2 or len(total_warning_details) >= 2:
            confidence = "low"
            confidence_reasons.append(
                ConfidenceReason(
                    label="Multiple unresolved review flags",
                    impact="negative",
                    detail="The estimate depends on assumptions that still require preparer review.",
                )
            )

        assumptions = [
            *profile.assumptions,
            f"Engine version: {settings.estimation_engine_version}",
            "State estimate is limited-scope and should be reviewed before use.",
            "This estimate is not a filed return and remains subject to human review.",
        ]

        result = EstimateResult(
            case_id=profile.case_id,
            engine_version=settings.estimation_engine_version,
            generated_at=datetime.now(timezone.utc),
            estimated_federal_refund_or_due=estimated_federal,
            estimated_state_refund_or_due=estimated_state,
            confidence=confidence,
            assumptions=assumptions,
            assumptions_detail=total_assumption_details,
            missing_data_warnings=[*profile.warnings, *profile.missing_items],
            warning_details=total_warning_details,
            confidence_reasons=confidence_reasons,
            human_review_required=True,
            line_items=line_items,
            client_insights=[],
            internal_insights=[],
            citations=[CitationRecord(**citation) for citation in IRS_CITATIONS],
        )
        result.client_insights = build_client_insights(profile, result)
        result.internal_insights = build_internal_insights(profile, result)
        return result
