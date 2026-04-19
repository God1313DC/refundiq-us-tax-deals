from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.schemas import IngestionRunRequest
from app.services.research_ingestion import IRSResearchIngestionService
from app.workers.tasks import enqueue_source_ingestion


def should_run(last_run_at: datetime | None, now: datetime, interval_minutes: int) -> bool:
    if last_run_at is None:
        return True
    return now >= last_run_at + timedelta(minutes=interval_minutes)


def trigger_source_sync() -> dict:
    payload = IngestionRunRequest(run_type="scheduled", limit=settings.admin_sync_limit)
    try:
        job_id = enqueue_source_ingestion(payload)
        return {"status": "queued", "job_id": job_id}
    except Exception:
        summary = IRSResearchIngestionService().run(payload)
        return {"status": "completed_inline", "job_id": summary.job_id}


def run_scheduler_loop() -> None:
    if not settings.scheduler_enabled:
        print("RefundIQ scheduler is disabled. Set SCHEDULER_ENABLED=true to run scheduled ingestion.")
        return

    if settings.scheduler_startup_delay_seconds > 0:
        time.sleep(settings.scheduler_startup_delay_seconds)

    last_source_sync_at: datetime | None = None
    if settings.scheduler_run_on_startup:
        trigger_source_sync()
        last_source_sync_at = datetime.now(timezone.utc)

    while True:
        now = datetime.now(timezone.utc)
        if should_run(last_source_sync_at, now, settings.scheduler_source_interval_minutes):
            trigger_source_sync()
            last_source_sync_at = now
        time.sleep(max(5, settings.scheduler_poll_seconds))


if __name__ == "__main__":
    run_scheduler_loop()
