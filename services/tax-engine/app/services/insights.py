from __future__ import annotations

from app.schemas import EstimateResult, NormalizedTaxProfile


def build_client_insights(profile: NormalizedTaxProfile, estimate: EstimateResult) -> list[str]:
    insights: list[str] = []

    if profile.tuition_paid > 0:
        insights.append("Your estimate may improve if we confirm all education-related documents and eligibility.")

    if estimate.estimated_federal_refund_or_due < 0:
        insights.append("You may owe tax because withholding appears low compared with current income.")
    else:
        insights.append("You currently appear to be on track for a refund, subject to final review.")

    if profile.missing_items:
        insights.append("Uploading the remaining missing documents can improve estimate confidence.")

    if estimate.confidence == "low":
        insights.append("A preparer should review this estimate before you make filing decisions.")

    return insights[:3]


def build_internal_insights(profile: NormalizedTaxProfile, estimate: EstimateResult) -> list[str]:
    insights: list[str] = []

    if profile.nonemployee_compensation > 0:
        insights.append("Review self-employment income and confirm expense support before final software entry.")

    if profile.tuition_paid > 0:
        insights.append("Possible education credit scenario; verify 1098-T details and student eligibility.")

    if profile.state_of_residence and profile.state_withholding == 0:
        insights.append("State or local withholding appears incomplete relative to intake answers.")

    if estimate.confidence == "low":
        insights.append("Confidence is low due to missing items or conflicting records; keep in manual review queue.")

    if profile.warning_details:
        insights.append("Confidence explanation and warnings should be retained with the case audit trail.")

    return insights[:4]
