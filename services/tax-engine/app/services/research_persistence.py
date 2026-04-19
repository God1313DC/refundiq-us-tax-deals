from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.schemas import ParsedSourceContent, SourceVersionDiff


class ResearchPersistenceService:
    def __init__(self) -> None:
        self.base_url = settings.effective_supabase_url
        self.service_key = settings.supabase_service_role_key
        self.enabled = bool(self.base_url and self.service_key)

    def _client(self) -> httpx.Client:
        assert self.base_url
        assert self.service_key
        return httpx.Client(
            base_url=f"{self.base_url}/rest/v1",
            timeout=20,
            headers={
                "apikey": self.service_key,
                "Authorization": f"Bearer {self.service_key}",
                "Content-Type": "application/json",
            },
        )

    def _request(
        self,
        client: httpx.Client,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        prefer: str | None = None,
    ) -> httpx.Response:
        headers = {}
        if prefer:
            headers["Prefer"] = prefer
        response = client.request(method, path, params=params, json=json, headers=headers)
        response.raise_for_status()
        return response

    def create_ingestion_job(self, run_type: str, source_document_id: str | None = None) -> str | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/source_ingestion_jobs",
                json={
                    "source_document_id": source_document_id,
                    "status": "processing",
                    "run_type": run_type,
                    "payload": {"started_at": now_iso()},
                    "run_started_at": now_iso(),
                },
                prefer="return=representation",
            )
            rows = response.json()
            return rows[0]["id"] if rows else None

    def update_ingestion_job(self, job_id: str | None, **fields: Any) -> None:
        if not self.enabled or not job_id:
            return
        with self._client() as client:
            payload = {**fields, "updated_at": now_iso()}
            self._request(
                client,
                "PATCH",
                "/source_ingestion_jobs",
                params={"id": f"eq.{job_id}"},
                json=payload,
                prefer="return=minimal",
            )

    def list_source_documents(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            response = self._request(
                client,
                "GET",
                "/source_documents",
                params={
                    "select": "id,title,source_url,source_type,authority_type,authority_tier,jurisdiction,priority_order,topic_tags,tax_year,form_number,publication_number,draft_only,last_synced_at,last_success_at,last_status,last_error"
                },
            )
            return response.json()

    def upsert_source_document(self, parsed: ParsedSourceContent) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/source_documents",
                params={"on_conflict": "source_url"},
                json={
                    "title": parsed.title,
                    "source_url": parsed.source_url,
                    "source_type": parsed.source_type,
                    "authority_type": parsed.authority_type,
                    "authority_tier": parsed.authority_tier,
                    "priority_order": parsed.authority_tier,
                    "jurisdiction": parsed.jurisdiction,
                    "status": "draft" if parsed.draft_only else "active",
                    "revision_date": parsed.revision_date,
                    "tax_year": parsed.tax_year,
                    "form_number": parsed.form_number,
                    "publication_number": parsed.publication_number,
                    "topic_tags": parsed.topic_tags,
                    "checksum": parsed.checksum,
                    "draft_only": parsed.draft_only,
                    "last_synced_at": now_iso(),
                    "last_success_at": now_iso(),
                    "last_status": "draft_only" if parsed.draft_only else "healthy",
                    "last_error": None,
                },
                prefer="resolution=merge-duplicates,return=representation",
            )
            rows = response.json()
            return rows[0] if rows else None

    def mark_source_failed(self, source_url: str, error: str) -> None:
        if not self.enabled:
            return
        with self._client() as client:
            self._request(
                client,
                "PATCH",
                "/source_documents",
                params={"source_url": f"eq.{source_url}"},
                json={
                    "last_synced_at": now_iso(),
                    "last_status": "failed",
                    "last_error": error[:1000],
                },
                prefer="return=minimal",
            )

    def get_latest_source_version(self, source_document_id: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "GET",
                "/source_versions",
                params={
                    "source_document_id": f"eq.{source_document_id}",
                    "select": "id,content_hash,text_content,version_label,published_at",
                    "order": "created_at.desc",
                    "limit": "1",
                },
            )
            rows = response.json()
            return rows[0] if rows else None

    def insert_source_version(self, source_document_id: str, parsed: ParsedSourceContent, diff: SourceVersionDiff) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/source_versions",
                json={
                    "source_document_id": source_document_id,
                    "version_label": parsed.revision_date or parsed.tax_year or "latest",
                    "published_at": now_iso(),
                    "content_hash": parsed.checksum,
                    "extracted_summary": parsed.extracted_summary,
                    "content_type": parsed.content_type,
                    "raw_content": parsed.text_content[:15000],
                    "text_content": parsed.text_content,
                    "metadata": parsed.metadata,
                    "diff_summary": diff.diff_summary,
                    "tax_year": parsed.tax_year,
                    "revision_date": parsed.revision_date,
                },
                prefer="return=representation",
            )
            rows = response.json()
            return rows[0] if rows else None

    def insert_change_event(
        self,
        source_document_id: str,
        source_version_id: str,
        previous_source_version_id: str | None,
        parsed: ParsedSourceContent,
        diff: SourceVersionDiff,
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/change_events",
                json={
                    "source_document_id": source_document_id,
                    "source_version_id": source_version_id,
                    "previous_source_version_id": previous_source_version_id,
                    "title": f"Source update detected: {parsed.title}",
                    "summary": diff.diff_summary,
                    "severity": "info" if not parsed.draft_only else "warning",
                    "effective_date": parsed.revision_date,
                    "impacted_topics": parsed.topic_tags,
                    "impacted_case_types": infer_impacted_case_types(parsed.scope_tag),
                    "diff_summary": diff.excerpt or diff.diff_summary,
                },
                prefer="return=representation",
            )
            rows = response.json()
            return rows[0] if rows else None

    def upsert_rule_card(self, source_document_id: str, source_version_id: str, parsed: ParsedSourceContent) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/rule_cards",
                params={"on_conflict": "scope_tag"},
                json={
                    "title": build_rule_title(parsed),
                    "summary": build_rule_summary(parsed),
                    "scope_tag": parsed.scope_tag,
                    "authority_level": parsed.authority_tier,
                    "decision_rule": build_decision_rule(parsed),
                    "client_safe_summary": build_client_safe_summary(parsed),
                    "source_document_id": source_document_id,
                    "effective_date": parsed.revision_date,
                    "tax_year": parsed.tax_year,
                    "required_docs": infer_required_docs(parsed.scope_tag),
                    "exceptions": ["Escalate ambiguous or unsupported scenarios to a human preparer."],
                    "follow_up_questions": infer_follow_up_questions(parsed.scope_tag),
                    "internal_review_notes": "Generated from official-source ingestion. Review before changing estimator logic.",
                    "impacted_case_types": infer_impacted_case_types(parsed.scope_tag),
                    "updated_at": now_iso(),
                },
                prefer="resolution=merge-duplicates,return=representation",
            )
            rows = response.json()
            rule_card = rows[0] if rows else None
            if rule_card:
                self._request(
                    client,
                    "DELETE",
                    "/citations",
                    params={"rule_card_id": f"eq.{rule_card['id']}"},
                    prefer="return=minimal",
                )
                self._request(
                    client,
                    "POST",
                    "/citations",
                    json={
                        "rule_card_id": rule_card["id"],
                        "source_version_id": source_version_id,
                        "excerpt": parsed.extracted_summary[:500],
                        "citation_label": parsed.title,
                    },
                    prefer="return=minimal",
                )
            return rule_card

    def insert_research_alert(
        self,
        source_document_id: str,
        change_event_id: str | None,
        rule_card_id: str | None,
        parsed: ParsedSourceContent,
        diff: SourceVersionDiff,
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "POST",
                "/research_alerts",
                json={
                    "title": f"{parsed.title} update detected",
                    "severity": "warning" if parsed.draft_only or "quickalerts" in parsed.topic_tags else "info",
                    "summary": diff.diff_summary,
                    "effective_date": parsed.revision_date,
                    "related_rule_card_id": rule_card_id,
                    "related_change_event_id": change_event_id,
                    "source_document_id": source_document_id,
                    "impacted_case_types": infer_impacted_case_types(parsed.scope_tag),
                    "authority_level": parsed.authority_tier,
                },
                prefer="return=representation",
            )
            rows = response.json()
            return rows[0] if rows else None

    def refresh_case_rule_matches(self, rule_card_id: str, scope_tag: str, explanation: str) -> None:
        if not self.enabled:
            return
        with self._client() as client:
            response = self._request(
                client,
                "GET",
                "/tax_profiles",
                params={"select": "case_id,normalized_json"},
            )
            cases = response.json()
            for item in cases:
                if not case_matches_scope(item.get("normalized_json") or {}, scope_tag):
                    continue
                existing = self._request(
                    client,
                    "GET",
                    "/case_rule_matches",
                    params={
                        "case_id": f"eq.{item['case_id']}",
                        "rule_card_id": f"eq.{rule_card_id}",
                        "select": "id",
                        "limit": "1",
                    },
                ).json()
                if existing:
                    continue
                self._request(
                    client,
                    "POST",
                    "/case_rule_matches",
                    json={
                        "case_id": item["case_id"],
                        "rule_card_id": rule_card_id,
                        "severity": "warning" if scope_tag in {"education", "withholding", "quickalerts"} else "info",
                        "explanation": explanation,
                        "status": "open",
                    },
                    prefer="return=minimal",
                )


def build_rule_title(parsed: ParsedSourceContent) -> str:
    if parsed.draft_only:
        return f"Draft-only review: {parsed.title}"
    return f"Rule update: {parsed.title}"


def build_rule_summary(parsed: ParsedSourceContent) -> str:
    prefix = "Draft-only source; do not treat as final authority." if parsed.draft_only else "Official-source update."
    return f"{prefix} {parsed.extracted_summary[:400]}"


def build_decision_rule(parsed: ParsedSourceContent) -> str:
    return f"Use {parsed.title} as an internal cited reference for scope '{parsed.scope_tag}' and route ambiguous scenarios to human review."


def build_client_safe_summary(parsed: ParsedSourceContent) -> str:
    if parsed.scope_tag == "education":
        return "Education-related estimates may change after document and eligibility review."
    if parsed.scope_tag == "withholding":
        return "Withholding-related estimates may change after a preparer confirms your records."
    return "Your estimate may change after a preparer reviews current filing guidance and documents."


def infer_required_docs(scope_tag: str) -> list[str]:
    mapping = {
        "education": ["1098-T", "proof of payment", "student eligibility details"],
        "withholding": ["W-2", "1099 withholding support"],
        "tin-matching": ["payer authorization", "information return workflow details"],
        "transcript-workflow": ["authorization forms", "transcript request context"],
    }
    return mapping.get(scope_tag, ["Primary income documents", "Any related support documents"])


def infer_follow_up_questions(scope_tag: str) -> list[str]:
    mapping = {
        "education": [
            "Do we have payment support in addition to Form 1098-T?",
            "Is the student eligible for the claimed education benefit?",
        ],
        "withholding": [
            "Do withholding amounts appear complete across all wage and 1099 sources?",
            "Should the case be escalated because withholding looks insufficient?",
        ],
        "quickalerts": [
            "Does the recent operational update affect filing-season procedures for this case?",
        ],
    }
    return mapping.get(scope_tag, ["Does this source update require preparer review before filing?"])


def infer_impacted_case_types(scope_tag: str) -> list[str]:
    mapping = {
        "education": ["1098-t", "education-credit", "dependent-review"],
        "withholding": ["w-2", "1099", "balance-due-risk"],
        "quickalerts": ["operational-workflow", "filing-season"],
        "iris-a2a": ["information-returns", "1099"],
        "tin-matching": ["information-returns", "payer-workflow"],
        "transcript-workflow": ["authorization", "transcript-request"],
        "mef": ["software-handoff", "schema-monitoring"],
    }
    return mapping.get(scope_tag, ["general-1040"])


def case_matches_scope(normalized_json: dict[str, Any], scope_tag: str) -> bool:
    if scope_tag == "education":
        return bool(normalized_json.get("tuition_paid") or normalized_json.get("scholarships"))
    if scope_tag == "withholding":
        return bool(normalized_json.get("federal_withholding") or normalized_json.get("state_withholding"))
    if scope_tag in {"standard-deduction", "mef", "quickalerts"}:
        return True
    if scope_tag == "iris-a2a":
        return bool(normalized_json.get("interest_income") or normalized_json.get("dividend_income") or normalized_json.get("misc_income"))
    return False


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
