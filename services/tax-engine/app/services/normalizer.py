from __future__ import annotations

from collections import defaultdict

from app.schemas import (
    AssumptionRecord,
    CasePayload,
    ClassifiedDocument,
    NormalizedTaxProfile,
    WarningRecord,
)


class TaxProfileNormalizer:
    def normalize(self, payload: CasePayload, documents: list[ClassifiedDocument]) -> NormalizedTaxProfile:
        profile = NormalizedTaxProfile(
            case_id=payload.case_id,
            tax_year=payload.tax_year,
            filing_status=payload.intake.filing_status,
            state_of_residence=payload.intake.state_of_residence,
            dependents_count=payload.intake.dependents_count,
            qualifying_child_count=payload.intake.qualifying_child_count,
        )

        source_map = defaultdict(list)

        for document in documents:
            for field in document.extracted_fields:
                source_map[field.name].append(field)
                numeric_value = float(field.value) if isinstance(field.value, (float, int)) else 0.0

                if field.name == "wages":
                    profile.wages += numeric_value
                elif field.name == "federal_withholding":
                    profile.federal_withholding += numeric_value
                elif field.name == "state_withholding":
                    profile.state_withholding += numeric_value
                elif field.name == "interest_income":
                    profile.interest_income += numeric_value
                elif field.name == "dividend_income":
                    profile.dividend_income += numeric_value
                elif field.name == "misc_income":
                    profile.misc_income += numeric_value
                elif field.name == "nonemployee_compensation":
                    profile.nonemployee_compensation += numeric_value
                elif field.name == "tuition_paid":
                    profile.tuition_paid += numeric_value
                elif field.name == "scholarships":
                    profile.scholarships += numeric_value
                elif field.name == "mortgage_interest":
                    profile.mortgage_interest += numeric_value

        profile.source_map = dict(source_map)
        profile.assumptions.extend(
            [
                f"Using tax-year {payload.tax_year} constants configured for MVP review workflow.",
                "No itemized deduction calculation is performed in the MVP.",
            ]
        )
        profile.assumptions_detail.extend(
            [
                AssumptionRecord(
                    code="standard-deduction-only",
                    label="Standard deduction path",
                    detail="The MVP does not attempt itemized deductions unless a future reviewed rule path is added.",
                ),
                AssumptionRecord(
                    code="common-1040-scope",
                    label="Limited return scope",
                    detail="Only basic individual return scenarios are included in this estimate path.",
                ),
            ]
        )

        if payload.intake.self_employment and profile.nonemployee_compensation == 0:
            profile.warnings.append("Intake indicates self-employment but no 1099-NEC data is currently normalized.")
            profile.missing_items.append("1099-NEC or self-employment income support")
            profile.warning_details.append(
                WarningRecord(
                    code="missing-self-employment-support",
                    severity="warning",
                    message="Self-employment was selected in intake but matching income support is missing.",
                    action="Request 1099-NEC or equivalent income support before final review.",
                )
            )

        if payload.intake.has_1098_t and profile.tuition_paid == 0:
            profile.missing_items.append("1098-T or education payment support")
            profile.warning_details.append(
                WarningRecord(
                    code="education-support-missing",
                    severity="warning",
                    message="Education scenario is incomplete because tuition support is missing.",
                    action="Collect 1098-T or equivalent tuition payment support.",
                )
            )

        if payload.intake.local_tax_jurisdiction and profile.state_withholding == 0:
            profile.warnings.append("Local or state withholding detail may be incomplete.")
            profile.warning_details.append(
                WarningRecord(
                    code="local-tax-gap",
                    severity="info",
                    message="Local or state withholding detail appears incomplete relative to intake answers.",
                    action="Ask for state or local withholding details if applicable.",
                )
            )

        return profile
