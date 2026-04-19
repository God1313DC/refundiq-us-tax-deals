from __future__ import annotations

from app.adapters.summary_utils import build_manual_entry_summary


def export(case_id: str, payload: dict) -> dict:
    return {
        "adapter": "manual_review_queue_adapter",
        "case_id": case_id,
        "status": "queued",
        "message": "Case has been routed to manual review workflow for tax software entry.",
        "manual_entry_summary": build_manual_entry_summary(case_id, payload),
    }
