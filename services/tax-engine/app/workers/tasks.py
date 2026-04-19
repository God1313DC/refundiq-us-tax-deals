from __future__ import annotations

import json

from redis import Redis
from rq import Queue, Worker

from app.config import settings
from app.schemas import CasePayload, IngestionRunRequest
from app.services.document_pipeline import DocumentPipeline
from app.services.research_ingestion import IRSResearchIngestionService
from app.services.persistence import SupabasePersistenceService
from app.services.rules.engine import TaxEstimator


def get_queue(name: str = "document-processing") -> Queue:
    return Queue(name, connection=Redis.from_url(settings.redis_url))


def get_source_queue() -> Queue:
    return get_queue("source-ingestion")


def enqueue_case_processing(payload: CasePayload) -> str:
    job = get_queue().enqueue("app.workers.tasks.process_case_job", payload.model_dump_json())
    return job.id


def enqueue_source_ingestion(payload: IngestionRunRequest) -> str:
    job = get_source_queue().enqueue("app.workers.tasks.process_source_ingestion_job", payload.model_dump_json())
    return job.id


def process_case_job(payload_json: str) -> dict:
    payload = CasePayload.model_validate(json.loads(payload_json))
    pipeline = DocumentPipeline()
    estimator = TaxEstimator()
    persistence = SupabasePersistenceService()
    persistence.mark_processing_job_started(payload.processing_job_id)
    try:
        classified, normalized = pipeline.process(payload)
        estimate = estimator.run(normalized)
        persistence.persist_case_processing(payload, classified, normalized, estimate)
    except Exception as exc:
        persistence.mark_processing_job_failed(payload.processing_job_id, str(exc))
        raise

    return {
        "case_id": payload.case_id,
        "status": "completed",
        "classified_documents": [item.model_dump() for item in classified],
        "normalized_profile": normalized.model_dump(),
        "estimate": estimate.model_dump(),
    }


def process_source_ingestion_job(payload_json: str) -> dict:
    payload = IngestionRunRequest.model_validate(json.loads(payload_json))
    service = IRSResearchIngestionService()
    summary = service.run(payload)
    return summary.model_dump(mode="json")


if __name__ == "__main__":
    worker = Worker(["document-processing", "source-ingestion"], connection=Redis.from_url(settings.redis_url))
    worker.work()
