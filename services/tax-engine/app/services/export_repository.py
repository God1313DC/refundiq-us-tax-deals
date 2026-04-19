from __future__ import annotations

from typing import Any

import httpx

from app.config import settings


class SupabaseExportRepository:
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
        headers = {"Prefer": prefer} if prefer else None
        response = client.request(method, path, params=params, json=json, headers=headers)
        response.raise_for_status()
        return response

    def fetch_case_export_bundle(self, case_id: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        with self._client() as client:
            response = self._request(
                client,
                "GET",
                "/cases",
                params={
                    "id": f"eq.{case_id}",
                    "select": (
                        "id,case_number,status,filing_status,state_of_residence,confidence_band,"
                        "users!cases_client_user_id_fkey(full_name,email),"
                        "tax_profiles(normalized_json,assumptions,missing_items,warnings),"
                        "estimate_runs(id,engine_version,estimated_federal_refund_or_due,estimated_state_refund_or_due,confidence_band,assumptions,missing_data_warnings,confidence_reasons,human_review_required,estimate_line_items(label,amount,category,note),client_insights,internal_insights),"
                        "documents(id,file_name,form_type,status),"
                        "review_notes(note,created_at,internal_only,users(full_name,role)),"
                        "case_rule_matches(severity,explanation,rule_cards(title)),"
                        "research_queries(id,question,answer,review_status,conflict_detected,human_review_required,guidance_label,decision_summary,created_at)"
                    ),
                    "limit": "1",
                },
            )
            rows = response.json()
            return rows[0] if rows else None

    def record_export(
        self,
        *,
        case_id: str,
        export_type: str,
        status: str,
        exported_by: str | None,
        output_path: str | None,
        payload: dict[str, Any],
    ) -> None:
        if not self.enabled:
            return
        with self._client() as client:
            self._request(
                client,
                "POST",
                "/integration_exports",
                json={
                    "case_id": case_id,
                    "export_type": export_type,
                    "status": status,
                    "exported_by": exported_by,
                    "output_path": output_path,
                    "payload": payload,
                },
                prefer="return=minimal",
            )
