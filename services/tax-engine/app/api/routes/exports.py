from fastapi import APIRouter, HTTPException

from app.adapters import (
    csv_export_adapter,
    drake_documents_adapter,
    drake_portal_adapter,
    manual_review_queue_adapter,
    pdf_workpaper_export_adapter,
)
from app.schemas import ExportRequest
from app.services.export_repository import SupabaseExportRepository

router = APIRouter(prefix="/v1/exports", tags=["exports"])
repository = SupabaseExportRepository()


def _build_export_payload(case_id: str) -> dict:
    row = repository.fetch_case_export_bundle(case_id)
    if not row:
        return {
            "case_id": case_id,
            "filing_status": "review_required",
            "estimated_federal_refund_or_due": "pending_review",
            "estimated_state_refund_or_due": "pending_review",
            "missing_items": ["Complete normalized profile export hookup."],
            "warnings": ["Export payload fallback used because database-backed case context was unavailable."],
        }

    profile = (row.get("tax_profiles") or [{}])[0]
    estimate = (row.get("estimate_runs") or [{}])[0]
    return {
        "case_id": case_id,
        "case_number": row.get("case_number"),
        "client_name": row.get("users", {}).get("full_name", "Client"),
        "client_email": row.get("users", {}).get("email"),
        "status": row.get("status"),
        "filing_status": row.get("filing_status") or (profile or {}).get("normalized_json", {}).get("filing_status"),
        "state_of_residence": row.get("state_of_residence"),
        "confidence_band": estimate.get("confidence_band") or row.get("confidence_band"),
        "estimated_federal_refund_or_due": estimate.get("estimated_federal_refund_or_due"),
        "estimated_state_refund_or_due": estimate.get("estimated_state_refund_or_due"),
        "missing_items": profile.get("missing_items") or [],
        "warnings": profile.get("warnings") or estimate.get("missing_data_warnings") or [],
        "assumptions": profile.get("assumptions") or estimate.get("assumptions") or [],
        "documents": [f"{doc.get('file_name')} ({doc.get('status')})" for doc in row.get("documents") or []],
        "line_items": estimate.get("estimate_line_items") or [],
        "client_insights": estimate.get("client_insights") or [],
        "internal_insights": estimate.get("internal_insights") or [],
        "review_notes": [
            f"{note.get('users', {}).get('full_name', 'Reviewer')}: {note.get('note')}"
            for note in row.get("review_notes") or []
            if note.get("internal_only")
        ],
        "rule_alerts": [
            f"{match.get('rule_cards', {}).get('title', 'Rule')}: {match.get('explanation')}"
            for match in row.get("case_rule_matches") or []
        ],
        "research_conclusions": [
            item.get("decision_summary") or item.get("guidance_label") or item.get("review_status")
            for item in row.get("research_queries") or []
            if item.get("decision_summary") or item.get("guidance_label") or item.get("review_status")
        ],
        "human_review_required": estimate.get("human_review_required", True),
    }


@router.post("/{case_id}")
def export_case(case_id: str, request: ExportRequest) -> dict:
    payload = _build_export_payload(case_id)
    if request.export_type == "drake_documents_adapter":
        result = drake_documents_adapter.export(case_id)
    elif request.export_type == "drake_portal_adapter":
        result = drake_portal_adapter.export(case_id)
    elif request.export_type == "csv_export_adapter":
        result = csv_export_adapter.export(case_id, payload=payload)
    elif request.export_type == "pdf_workpaper_export_adapter":
        result = pdf_workpaper_export_adapter.export(case_id, payload=payload)
    elif request.export_type == "manual_review_queue_adapter":
        result = manual_review_queue_adapter.export(case_id, payload=payload)
    else:
        raise HTTPException(status_code=400, detail="Unsupported export type")

    repository.record_export(
        case_id=case_id,
        export_type=request.export_type,
        status=result.get("status", "ready"),
        exported_by=request.requested_by,
        output_path=result.get("filename") or result.get("output_path"),
        payload=result,
    )
    return result
