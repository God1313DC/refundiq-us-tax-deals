from fastapi import APIRouter

from app.schemas import CasePayload, EstimateRerunPayload
from app.services.document_pipeline import DocumentPipeline
from app.services.persistence import SupabasePersistenceService
from app.services.rules.engine import TaxEstimator

router = APIRouter(prefix="/v1/estimates", tags=["estimates"])
pipeline = DocumentPipeline()
engine = TaxEstimator()
persistence = SupabasePersistenceService()


@router.post("/run")
def run_estimate(payload: CasePayload) -> dict:
    classified, normalized = pipeline.process(payload)
    estimate = engine.run(normalized)
    return {
        "case_id": payload.case_id,
        "classified_documents": [item.model_dump() for item in classified],
        "normalized_profile": normalized.model_dump(),
        "estimate": estimate.model_dump(),
    }


@router.post("/rerun-from-profile")
def rerun_from_profile(payload: EstimateRerunPayload) -> dict:
    estimate = engine.run(payload.normalized_profile)
    if payload.persist_result:
        persistence.persist_estimate_only(payload.normalized_profile, estimate, payload.generated_by)
    return {
        "case_id": payload.normalized_profile.case_id,
        "normalized_profile": payload.normalized_profile.model_dump(),
        "estimate": estimate.model_dump(),
    }
