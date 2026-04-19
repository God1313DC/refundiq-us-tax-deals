from __future__ import annotations

from typing import Any

import httpx

from app.config import settings


class SupabaseResearchRepository:
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

    def _request(self, client: httpx.Client, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        response = client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    def get_rule_cards(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            return self._request(
                client,
                "/rule_cards",
                {
                    "select": (
                        "id,title,summary,scope_tag,authority_level,effective_date,tax_year,follow_up_questions,"
                        "citations(excerpt,citation_label,source_versions(id,revision_date,tax_year,source_documents(id,title,source_url,authority_type,authority_tier,draft_only)))"
                    ),
                    "order": "updated_at.desc",
                    "limit": "50",
                },
            )

    def get_source_versions(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            return self._request(
                client,
                "/source_versions",
                {
                    "select": (
                        "id,revision_date,tax_year,extracted_summary,text_content,content_hash,"
                        "source_documents(id,title,source_url,source_type,authority_type,authority_tier,draft_only,topic_tags,last_success_at,last_status,form_number,publication_number)"
                    ),
                    "order": "published_at.desc",
                    "limit": "80",
                },
            )

    def get_change_events(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            return self._request(
                client,
                "/change_events",
                {
                    "select": "id,title,summary,severity,effective_date,diff_summary,impacted_topics,source_documents(title)",
                    "order": "created_at.desc",
                    "limit": "40",
                },
            )

    def get_recent_alerts(self) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            return self._request(
                client,
                "/research_alerts",
                {
                    "select": "id,title,severity,summary,effective_date,impacted_case_types,authority_level,related_rule_card_id",
                    "order": "created_at.desc",
                    "limit": "25",
                },
            )

    def get_case_rule_matches(self, case_id: str) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self._client() as client:
            return self._request(
                client,
                "/case_rule_matches",
                {
                    "case_id": f"eq.{case_id}",
                    "select": "id,severity,explanation,status,rule_cards(id,title,summary,scope_tag,authority_level,follow_up_questions,effective_date,tax_year)",
                    "order": "created_at.desc",
                    "limit": "25",
                },
            )
