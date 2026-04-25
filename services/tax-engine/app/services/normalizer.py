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
        usable_documents = [document for document in documents if document.status == "processed"]
        seen_form_types = {document.form_type for document in usable_documents}
        profile = NormalizedTaxProfile(
            case_id=payload.case_id,
            tax_year=payload.tax_year,
            filing_status=payload.intake.filing_status,
            state_of_residence=payload.intake.state_of_residence,
            has_1098_t_support="1098_t" in seen_form_types,
            dependents_count=payload.intake.dependents_count,
            qualifying_child_count=payload.intake.qualifying_child_count,
        )

        source_map = defaultdict(list)

        for document in usable_documents:
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
        blocked_documents = [document for document in documents if document.status in {"duplicate", "conflicting", "unreadable"}]
        if blocked_documents:
            profile.warnings.append("Some uploaded documents were excluded from the estimate because they were duplicates, conflicting, or unreadable.")
            profile.warning_details.append(
                WarningRecord(
                    code="excluded-documents-review",
                    severity="warning",
                    message="One or more uploaded documents were not trusted enough to include in the estimate calculation.",
                    action="Review duplicate, conflicting, or unreadable uploads before relying on the estimate.",
                )
            )

        review_needed_documents = [document for document in documents if document.status == "review_needed"]
        if review_needed_documents:
            profile.warnings.append("The latest upload still needs review, so the estimate may not yet reflect every document you submitted.")
            profile.warning_details.append(
                WarningRecord(
                    code="review-needed-documents",
                    severity="warning",
                    message="At least one uploaded document could not be fully normalized from OCR/extraction yet.",
                    action="Upload a clearer PDF/image or let a preparer review the document before relying on the estimate.",
                )
            )

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

        if payload.intake.residency_status and payload.intake.residency_status != "citizen_or_resident":
            profile.warnings.append("Residency or immigration status may change filing rules and requires preparer review.")
            profile.warning_details.append(
                WarningRecord(
                    code="residency-status-review",
                    severity="warning",
                    message="Residency or visa status can affect filing treatment, treaty issues, or dependency/credit eligibility.",
                    action="Have a preparer confirm filing status treatment and eligibility before relying on the estimate.",
                )
            )

        if payload.intake.first_year_in_us or not payload.intake.lived_in_us_full_year:
            profile.warning_details.append(
                WarningRecord(
                    code="partial-year-residency-review",
                    severity="warning",
                    message="Partial-year or first-year U.S. presence may affect filing treatment and review assumptions.",
                    action="Confirm residency treatment and applicable filing rules during preparer review.",
                )
            )

        if payload.intake.spouse_has_different_residency:
            profile.warning_details.append(
                WarningRecord(
                    code="mixed-residency-household-review",
                    severity="warning",
                    message="Household residency differences may affect filing status treatment and elections.",
                    action="Have a preparer review spouse residency treatment before relying on the estimate.",
                )
            )

        if payload.intake.changed_immigration_status_this_year:
            profile.warning_details.append(
                WarningRecord(
                    code="immigration-status-change-review",
                    severity="critical",
                    message="A change in immigration or residency status during the year can affect filing treatment and review scope.",
                    action="Keep the case in preparer review and confirm immigration timeline before relying on the estimate.",
                )
            )

        if payload.intake.has_spouse_or_dependent_without_ssn:
            profile.warning_details.append(
                WarningRecord(
                    code="itin-ssn-review",
                    severity="warning",
                    message="A spouse or dependent may need ITIN or SSN-related review before certain positions can be finalized.",
                    action="Confirm identification number status and filing eligibility during preparer review.",
                )
            )

        if payload.intake.can_be_claimed_dependent:
            profile.warnings.append("Dependency status can affect deductions and credits.")
            profile.warning_details.append(
                WarningRecord(
                    code="dependent-status-review",
                    severity="warning",
                    message="Taxpayer indicated they may be claimed as a dependent on another return.",
                    action="Confirm dependency status before relying on deduction or credit assumptions.",
                )
            )

        if payload.intake.expects_w2 and profile.wages == 0:
            profile.missing_items.append("W-2 wage statement")
            profile.warning_details.append(
                WarningRecord(
                    code="w2-missing",
                    severity="warning",
                    message="The intake indicates W-2 income, but no W-2 wages were normalized from uploaded documents.",
                    action="Upload or verify W-2 support before relying on the estimate.",
                )
            )

        if payload.intake.expects_1099_nec and profile.nonemployee_compensation == 0:
            profile.missing_items.append("1099-NEC support")
            profile.warning_details.append(
                WarningRecord(
                    code="1099-nec-missing",
                    severity="warning",
                    message="The intake indicates 1099-NEC income, but no matching normalized amount was found.",
                    action="Upload or verify 1099-NEC support before relying on the estimate.",
                )
            )

        if payload.intake.expects_1099_misc and profile.misc_income == 0:
            profile.missing_items.append("1099-MISC support")

        if payload.intake.expects_1099_int and profile.interest_income == 0:
            profile.missing_items.append("1099-INT support")

        if payload.intake.expects_1099_div and profile.dividend_income == 0:
            profile.missing_items.append("1099-DIV support")

        if payload.intake.rental_income:
            profile.warnings.append("Rental income is outside the current MVP estimate scope and requires preparer review.")
            profile.warning_details.append(
                WarningRecord(
                    code="rental-income-unsupported",
                    severity="critical",
                    message="Rental income was selected in intake, but the current estimator does not model Schedule E activity.",
                    action="Keep the case in manual review and confirm rental income documents before relying on the estimate.",
                )
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

        if profile.nonemployee_compensation > 0 and profile.self_employment_expenses == 0:
            profile.assumptions.append("No self-employment expense support is currently normalized.")
            profile.assumptions_detail.append(
                AssumptionRecord(
                    code="self-employment-expenses-missing",
                    label="No business expense offsets applied",
                    detail="Nonemployee compensation is present, but the current normalized profile does not include verified business expense support.",
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

        if payload.intake.student_status and not payload.intake.has_1098_t and payload.intake.needs_education_review:
            profile.warning_details.append(
                WarningRecord(
                    code="student-review-needed",
                    severity="info",
                    message="Student-related questions suggest a possible education benefit or dependency review.",
                    action="Confirm student status, dependency status, and education support during preparer review.",
                )
            )

        if payload.intake.student_status and payload.intake.received_opt_cpt_income:
            profile.warning_details.append(
                WarningRecord(
                    code="opt-cpt-review",
                    severity="info",
                    message="Student indicated OPT/CPT-related work income.",
                    action="Confirm work authorization timing and document coverage during preparer review.",
                )
            )

        if payload.intake.received_unemployment_income:
            profile.missing_items.append("1099-G unemployment support")
            profile.warning_details.append(
                WarningRecord(
                    code="unemployment-support-review",
                    severity="warning",
                    message="Unemployment income was indicated in intake and may require 1099-G support.",
                    action="Request unemployment support before relying on the estimate.",
                )
            )

        if payload.intake.sold_stocks_or_crypto:
            profile.warning_details.append(
                WarningRecord(
                    code="investment-activity-review",
                    severity="critical",
                    message="Stock or crypto sales can materially change filing scope, but the current MVP estimator does not fully model those transactions.",
                    action="Escalate to preparer review and collect investment statements before relying on the estimate.",
                )
            )

        if payload.intake.had_marketplace_insurance:
            profile.missing_items.append("1095-A marketplace insurance support")
            profile.warning_details.append(
                WarningRecord(
                    code="marketplace-insurance-review",
                    severity="warning",
                    message="Marketplace insurance may require Form 1095-A and premium tax credit review.",
                    action="Collect 1095-A before relying on the estimate.",
                )
            )

        if payload.intake.has_foreign_income_or_accounts:
            profile.warning_details.append(
                WarningRecord(
                    code="foreign-income-review",
                    severity="critical",
                    message="Foreign income or account reporting can change filing scope and review requirements.",
                    action="Escalate to preparer review before relying on the estimate.",
                )
            )

        if payload.intake.had_multiple_states:
            profile.warning_details.append(
                WarningRecord(
                    code="multiple-state-review",
                    severity="warning",
                    message="Multiple-state activity may affect state filing requirements and state estimate accuracy.",
                    action="Review state filing footprint before relying on the state estimate.",
                )
            )

        if profile.tuition_paid > 0 and not profile.has_1098_t_support:
            profile.warnings.append("Education amounts are present, but 1098-T support is not currently normalized.")
            profile.warning_details.append(
                WarningRecord(
                    code="education-doc-review-needed",
                    severity="warning",
                    message="Education amounts were detected without a normalized 1098-T support document.",
                    action="Verify 1098-T details, scholarships, and student eligibility before relying on any education credit estimate.",
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

        if payload.intake.filing_status == "head_of_household" and payload.intake.qualifying_child_count == 0:
            profile.warning_details.append(
                WarningRecord(
                    code="hoh-review-needed",
                    severity="warning",
                    message="Head of household was selected without a qualifying child count in intake.",
                    action="Confirm head of household eligibility before relying on the estimate.",
                )
            )

        return profile
