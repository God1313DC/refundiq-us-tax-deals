from fastapi import APIRouter

from app.schemas import IngestionRunRequest, ResearchQuestion
from app.services.research_ingestion import IRSResearchIngestionService
from app.services.research import ResearchService
from app.workers.tasks import enqueue_source_ingestion, get_source_queue

router = APIRouter(prefix="/v1/research", tags=["research"])
service = ResearchService()
ingestion_service = IRSResearchIngestionService()


@router.get("/alerts")
def recent_alerts() -> dict:
    return {"alerts": [item.model_dump() for item in service.get_recent_alerts()]}


@router.post("/ask")
def ask_research(payload: ResearchQuestion) -> dict:
    answer = service.ask(payload)
    return answer.model_dump()


@router.post("/ingestion/run")
def run_ingestion(payload: IngestionRunRequest) -> dict:
    try:
        job_id = enqueue_source_ingestion(payload)
        return {"status": "queued", "job_id": job_id, "run_type": payload.run_type}
    except Exception:
        summary = ingestion_service.run(payload)
        return summary.model_dump(mode="json")


@router.get("/ingestion/jobs/{job_id}")
def source_ingestion_job_status(job_id: str) -> dict:
    try:
        job = get_source_queue().fetch_job(job_id)
    except Exception:
        return {"job_id": job_id, "status": "queue_unavailable"}
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return {"job_id": job_id, "status": job.get_status(), "result": job.result}
