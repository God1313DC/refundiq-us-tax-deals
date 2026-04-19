from __future__ import annotations


def build_manual_entry_summary(case_id: str, payload: dict) -> str:
    documents = payload.get("documents", [])
    review_notes = payload.get("review_notes", [])
    return "\n".join(
        [
            f"Case: {case_id}",
            "Manual tax software entry summary:",
            f"- Client: {payload.get('client_name', 'Client')}",
            f"- Filing status: {payload.get('filing_status', 'review required')}",
            f"- State: {payload.get('state_of_residence', 'review required')}",
            f"- Federal estimate: {payload.get('estimated_federal_refund_or_due', 'n/a')}",
            f"- State estimate: {payload.get('estimated_state_refund_or_due', 'n/a')}",
            f"- Confidence band: {payload.get('confidence_band', 'low')}",
            f"- Missing items: {', '.join(payload.get('missing_items', [])) or 'none recorded'}",
            f"- Warnings: {', '.join(payload.get('warnings', [])) or 'none recorded'}",
            f"- Documents received: {', '.join(documents) or 'none recorded'}",
            f"- Research / rule alerts: {', '.join(payload.get('rule_alerts', [])) or 'none recorded'}",
            f"- Reviewer notes: {', '.join(review_notes) or 'none recorded'}",
            "- Final filing still requires human preparer review in tax software.",
        ]
    )


def build_workpaper_sections(case_id: str, payload: dict) -> list[tuple[str, list[str]]]:
    return [
        (
            "Estimate Summary",
            [
                f"Federal estimate: {payload.get('estimated_federal_refund_or_due', 'n/a')}",
                f"State estimate: {payload.get('estimated_state_refund_or_due', 'n/a')}",
                f"Confidence band: {payload.get('confidence_band', 'low')}",
            ],
        ),
        (
            "Assumptions and Warnings",
            [
                f"Assumptions: {', '.join(payload.get('assumptions', [])) or 'none recorded'}",
                f"Warnings: {', '.join(payload.get('warnings', [])) or 'none recorded'}",
                f"Missing items: {', '.join(payload.get('missing_items', [])) or 'none recorded'}",
            ],
        ),
        (
            "Operational Review Notes",
            [
                f"Documents received: {', '.join(payload.get('documents', [])) or 'none recorded'}",
                f"Rule alerts: {', '.join(payload.get('rule_alerts', [])) or 'none recorded'}",
                f"Research conclusions: {', '.join(payload.get('research_conclusions', [])) or 'none recorded'}",
            ],
        ),
    ]
