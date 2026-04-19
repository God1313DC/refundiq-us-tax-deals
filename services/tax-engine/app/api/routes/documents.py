from fastapi import APIRouter

from app.schemas import CasePayload
from app.services.document_pipeline import DocumentPipeline
from app.services.persistence import SupabasePersistenceService
from app.services.rules.engine import TaxEstimator
from app.workers.tasks import enqueue_case_processing, get_queue

router = APIRouter(prefix="/v1/documents", tags=["documents"])
pipeline = DocumentPipeline()
estimator = TaxEstimator()
persistence = SupabasePersistenceService()


@router.post("/intake")
def intake_case(payload: CasePayload) -> dict:
    return {
        "case_id": payload.case_id,
        "documents_received": len(payload.documents),
        "consent_accepted": payload.intake.consent_accepted,
    }


@router.post("/process")
def process_documents(payload: CasePayload) -> dict:
    try:
        job_id = enqueue_case_processing(payload)
        return {
            "case_id": payload.case_id,
            "job_id": job_id,
            "status": "queued",
        }
    except Exception:
        # Local fallback keeps the API usable even when Redis or the worker is unavailable.
        pass

    classified, normalized = pipeline.process(payload)
    estimate = estimator.run(normalized)
    persistence.persist_case_processing(payload, classified, normalized, estimate)
    return {
        "case_id": payload.case_id,
        "status": "completed",
        "classified_documents": [item.model_dump() for item in classified],
        "normalized_profile": normalized.model_dump(),
        "estimate": estimate.model_dump(),
    }


@router.get("/jobs/{job_id}")
def document_job_status(job_id: str) -> dict:
    try:
        job = get_queue().fetch_job(job_id)
    except Exception:
        return {"job_id": job_id, "status": "queue_unavailable"}
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return {
        "job_id": job_id,
        "status": job.get_status(),
        "result": job.result,
    }
