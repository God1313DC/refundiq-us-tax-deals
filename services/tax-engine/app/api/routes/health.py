from fastapi import APIRouter
from redis import Redis
from rq import Queue

from app.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    redis_status = "unknown"
    queue_details: dict[str, int] | None = None
    try:
        connection = Redis.from_url(settings.redis_url)
        connection.ping()
        redis_status = "ok"
        queue_details = {
            "document_processing": len(Queue("document-processing", connection=connection)),
            "source_ingestion": len(Queue("source-ingestion", connection=connection)),
        }
    except Exception:
        redis_status = "unavailable"

    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.estimation_engine_version,
        "redis": redis_status,
        "supabase_configured": bool(settings.effective_supabase_url and settings.supabase_service_role_key),
        "ocr_provider": settings.ocr_provider,
        "scheduler_enabled": settings.scheduler_enabled,
        "test_mode": settings.test_mode,
        "queues": queue_details,
    }


@router.get("/ready")
def ready() -> dict:
    return {
        "status": "ready",
        "frontend_base_url": settings.frontend_base_url,
        "api_base_url": settings.api_base_url,
        "pdf_output_dir": settings.pdf_output_dir,
    }
