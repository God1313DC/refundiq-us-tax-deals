from __future__ import annotations

import httpx

from app.schemas import IngestionRunRequest
from app.services.research_ingestion import IRSResearchIngestionService
from app.services.source_diff import build_source_diff
from app.services.source_parsers.html_parser import parse_html_source
from app.services.source_catalog import DEFAULT_SOURCE_CATALOG


class FakePersistence:
    def __init__(self) -> None:
        self.sources = {}
        self.versions = {}
        self.rule_cards = {}
        self.alerts = {}
        self.matches = []

    def create_ingestion_job(self, run_type: str, source_document_id: str | None = None) -> str:
        return "job-test"

    def update_ingestion_job(self, job_id: str | None, **fields) -> None:
        self.last_job_update = {"job_id": job_id, **fields}

    def list_source_documents(self):
        return list(self.sources.values())

    def mark_source_failed(self, source_url: str, error: str) -> None:
        self.failed = {"source_url": source_url, "error": error}

    def upsert_source_document(self, parsed):
        record = {
            "id": self.sources.get(parsed.source_url, {}).get("id", f"source-{len(self.sources)+1}"),
            "title": parsed.title,
            "source_url": parsed.source_url,
            "source_type": parsed.source_type,
            "authority_type": parsed.authority_type,
            "authority_tier": parsed.authority_tier,
            "jurisdiction": parsed.jurisdiction,
            "priority_order": parsed.authority_tier,
            "topic_tags": parsed.topic_tags,
            "tax_year": parsed.tax_year,
            "form_number": parsed.form_number,
            "publication_number": parsed.publication_number,
            "draft_only": parsed.draft_only,
        }
        self.sources[parsed.source_url] = record
        return record

    def get_latest_source_version(self, source_document_id: str):
        versions = self.versions.get(source_document_id, [])
        return versions[-1] if versions else None

    def insert_source_version(self, source_document_id: str, parsed, diff):
        version = {
            "id": f"version-{len(self.versions.get(source_document_id, []))+1}",
            "content_hash": parsed.checksum,
            "text_content": parsed.text_content,
        }
        self.versions.setdefault(source_document_id, []).append(version)
        return version

    def insert_change_event(self, source_document_id: str, source_version_id: str, previous_source_version_id, parsed, diff):
        return {"id": f"change-{source_document_id}", "summary": diff.diff_summary}

    def upsert_rule_card(self, source_document_id: str, source_version_id: str, parsed):
        card = {"id": f"rule-{parsed.scope_tag}", "scope_tag": parsed.scope_tag}
        self.rule_cards[parsed.scope_tag] = card
        return card

    def insert_research_alert(self, source_document_id: str, change_event_id: str | None, rule_card_id: str | None, parsed, diff):
        alert = {"id": f"alert-{parsed.scope_tag}"}
        self.alerts[parsed.scope_tag] = alert
        return alert

    def refresh_case_rule_matches(self, rule_card_id: str, scope_tag: str, explanation: str) -> None:
        self.matches.append((rule_card_id, scope_tag, explanation))


def test_html_parser_extracts_revision_metadata():
    entry = DEFAULT_SOURCE_CATALOG[0]
    html = """
    <html>
      <head><title>Instructions for Form 1040 and 1040-SR</title></head>
      <body>
        <h1>Instructions for Form 1040 and 1040-SR</h1>
        <p>Tax Year 2025 filing guidance for individual returns.</p>
        <p>Page Last Reviewed or Updated: 25-Mar-2026</p>
      </body>
    </html>
    """
    parsed = parse_html_source(entry, html, "checksum-1")
    assert parsed.tax_year == 2025
    assert parsed.revision_date == "25-Mar-2026"
    assert parsed.form_number == "1040"


def test_source_diff_detects_changed_content():
    diff = build_source_diff("old text", "old", "new text", "new")
    assert diff.changed is True
    assert "hash changed" in diff.diff_summary.lower()


def test_research_ingestion_creates_source_versions_and_rule_updates():
    html = """
    <html>
      <body>
        <h1>Publication 970, Tax Benefits for Education</h1>
        <p>Tax Year 2025 education credit guidance.</p>
        <p>Page Last Reviewed or Updated: 25-Mar-2026</p>
      </body>
    </html>
    """

    transport = httpx.MockTransport(lambda request: httpx.Response(200, text=html, headers={"content-type": "text/html"}))
    client = httpx.Client(transport=transport)
    persistence = FakePersistence()
    service = IRSResearchIngestionService(persistence=persistence, fetcher=client)

    summary = service.run(IngestionRunRequest(run_type="manual", limit=1), persist_job=False)

    assert summary.success_count == 1
    assert summary.results[0].status in {"created", "updated"}
    assert persistence.rule_cards
    assert persistence.alerts
