from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Iterable

import httpx

from app.config import settings
from app.schemas import (
    IngestionRunRequest,
    ParsedSourceContent,
    SourceCatalogEntry,
    SourceIngestionResult,
    SourceIngestionRunSummary,
)
from app.services.research_persistence import ResearchPersistenceService
from app.services.source_catalog import DEFAULT_SOURCE_CATALOG
from app.services.source_diff import build_source_diff
from app.services.source_parsers.html_parser import parse_html_source
from app.services.source_parsers.pdf_parser import parse_pdf_source


class IRSResearchIngestionService:
    def __init__(
        self,
        persistence: ResearchPersistenceService | None = None,
        fetcher: httpx.Client | None = None,
    ) -> None:
        self.persistence = persistence or ResearchPersistenceService()
        self.fetcher = fetcher

    def run(self, request: IngestionRunRequest, *, persist_job: bool = True) -> SourceIngestionRunSummary:
        started_at = datetime.now(timezone.utc)
        job_id = self.persistence.create_ingestion_job(request.run_type) if persist_job else None
        results: list[SourceIngestionResult] = []
        success_count = 0
        failed_count = 0

        catalog = list(self._catalog_entries())
        if request.limit:
            catalog = catalog[: request.limit]

        try:
            for entry in catalog:
                try:
                    result = self._ingest_entry(entry)
                    results.append(result)
                    if result.status == "failed":
                        failed_count += 1
                    else:
                        success_count += 1
                except Exception as exc:
                    failed_count += 1
                    results.append(
                        SourceIngestionResult(
                            source_url=entry.source_url,
                            title=entry.title,
                            status="failed",
                            error=str(exc),
                        )
                    )
                    self.persistence.mark_source_failed(entry.source_url, str(exc))
            summary = SourceIngestionRunSummary(
                job_id=job_id,
                run_type=request.run_type,
                started_at=started_at,
                completed_at=datetime.now(timezone.utc),
                source_count=len(catalog),
                success_count=success_count,
                failed_count=failed_count,
                results=results,
            )
            self.persistence.update_ingestion_job(
                job_id,
                status="completed" if failed_count == 0 else "completed_with_errors",
                completed_at=summary.completed_at.isoformat(),
                source_count=summary.source_count,
                success_count=summary.success_count,
                failed_count=summary.failed_count,
                result_summary=f"Ingested {summary.success_count} sources with {summary.failed_count} failures.",
                payload=summary.model_dump(mode="json"),
            )
            return summary
        except Exception as exc:
            self.persistence.update_ingestion_job(
                job_id,
                status="failed",
                completed_at=datetime.now(timezone.utc).isoformat(),
                error_message=str(exc),
            )
            raise

    def _catalog_entries(self) -> Iterable[SourceCatalogEntry]:
        persisted = {item["source_url"]: item for item in self.persistence.list_source_documents()}
        seen = set()
        for entry in DEFAULT_SOURCE_CATALOG:
            seen.add(entry.source_url)
            yield entry
        for source_url, row in persisted.items():
            if source_url in seen:
                continue
            yield SourceCatalogEntry(
                title=row["title"],
                source_url=row["source_url"],
                source_type=row.get("source_type") or "guidance",
                authority_type=row["authority_type"],
                authority_tier=row.get("authority_tier") or 1,
                jurisdiction=row.get("jurisdiction") or "federal",
                priority_order=row.get("priority_order") or 1,
                topic_tags=row.get("topic_tags") or [],
                tax_year=row.get("tax_year"),
                form_number=row.get("form_number"),
                publication_number=row.get("publication_number"),
                draft_only=bool(row.get("draft_only")),
                scope_tag=(row.get("topic_tags") or ["general-1040"])[0],
            )

    def _ingest_entry(self, entry: SourceCatalogEntry) -> SourceIngestionResult:
        content, content_type = self._fetch_source(entry.source_url)
        checksum = hashlib.sha256(content).hexdigest()
        parsed = self._parse(entry, content, content_type, checksum)
        source_document = self.persistence.upsert_source_document(parsed)
        if not source_document:
            return SourceIngestionResult(
                source_url=entry.source_url,
                title=entry.title,
                status="failed",
                error="Supabase persistence is not configured.",
            )

        latest_version = self.persistence.get_latest_source_version(source_document["id"])
        diff = build_source_diff(
            latest_version["text_content"] if latest_version else None,
            latest_version["content_hash"] if latest_version else None,
            parsed.text_content,
            parsed.checksum,
        )

        if not diff.changed:
            return SourceIngestionResult(
                source_url=entry.source_url,
                title=parsed.title,
                status="unchanged",
                checksum=parsed.checksum,
                source_document_id=source_document["id"],
                change_summary=diff.diff_summary,
            )

        source_version = self.persistence.insert_source_version(source_document["id"], parsed, diff)
        change_event = self.persistence.insert_change_event(
            source_document["id"],
            source_version["id"] if source_version else "",
            latest_version["id"] if latest_version else None,
            parsed,
            diff,
        )
        rule_card = self.persistence.upsert_rule_card(
            source_document["id"],
            source_version["id"] if source_version else "",
            parsed,
        )
        if rule_card:
            self.persistence.refresh_case_rule_matches(rule_card["id"], parsed.scope_tag, diff.diff_summary)
        alert = self.persistence.insert_research_alert(
            source_document["id"],
            change_event["id"] if change_event else None,
            rule_card["id"] if rule_card else None,
            parsed,
            diff,
        )

        status = "draft_only" if parsed.draft_only else ("created" if not latest_version else "updated")
        return SourceIngestionResult(
            source_url=entry.source_url,
            title=parsed.title,
            status=status,
            checksum=parsed.checksum,
            change_summary=diff.diff_summary,
            source_document_id=source_document["id"],
            source_version_id=source_version["id"] if source_version else None,
            rule_card_id=rule_card["id"] if rule_card else None,
            alert_id=alert["id"] if alert else None,
        )

    def _fetch_source(self, source_url: str) -> tuple[bytes, str]:
        if self.fetcher:
            response = self.fetcher.get(source_url)
        else:
            with httpx.Client(
                timeout=settings.source_ingestion_timeout_seconds,
                headers={"User-Agent": settings.source_ingestion_user_agent},
                follow_redirects=True,
            ) as client:
                response = client.get(source_url)
        response.raise_for_status()
        return response.content, response.headers.get("content-type", "text/html")

    def _parse(self, entry: SourceCatalogEntry, content: bytes, content_type: str, checksum: str) -> ParsedSourceContent:
        if "pdf" in content_type or entry.source_url.lower().endswith(".pdf"):
            return parse_pdf_source(entry, content, checksum)
        return parse_html_source(entry, content.decode("utf-8", errors="ignore"), checksum)
