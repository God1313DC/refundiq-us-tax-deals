from fastapi import APIRouter

from app.schemas import ReviewAction

router = APIRouter(prefix="/v1/cases", tags=["cases"])


@router.get("/{case_id}")
def get_case(case_id: str) -> dict:
    return {
        "case_id": case_id,
        "status": "demo",
        "message": "Case retrieval would normally hydrate from Supabase/Postgres."
    }


@router.post("/{case_id}/review")
def review_case(case_id: str, action: ReviewAction) -> dict:
    return {
        "case_id": case_id,
        "reviewer_id": action.reviewer_id,
        "mark_reviewed": action.mark_reviewed,
        "ready_for_tax_software_entry": action.ready_for_tax_software_entry,
        "override_fields": action.override_fields,
        "note": action.note,
    }
