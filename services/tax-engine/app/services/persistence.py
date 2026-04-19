from __future__ import annotations

from typing import Any

import httpx

from app.config import settings
from app.schemas import CasePayload, ClassifiedDocument, EstimateResult, NormalizedTaxProfile
from app.services.research import ResearchService


class SupabasePersistenceService:
    def __init__(self) -> None:
        self.base_url = settings.effective_supabase_url
        self.service_key = settings.supabase_service_role_key
        self.enabled = bool(self.base_url and self.service_key)
        self.research = ResearchService()

    def persist_case_processing(
        self,
        payload: CasePayload,
        classified: list[ClassifiedDocument],
        normalized: NormalizedTaxProfile,
        estimate: EstimateResult,
    ) -> None:
        if not self.enabled:
            return

        with self._client() as client:
            case_row = self._fetch_case(client, payload.case_id)
            self._upsert_intake_questionnaire(client, payload)
            self._update_case_to_processing_complete(
                client, payload.case_id, case_row, estimate, payload.requested_by_user_id
            )
            self._persist_documents(client, payload.case_id, classified)
            self._persist_tax_profile(client, normalized)
            estimate_run = self._insert_estimate_run(client, payload.case_id, payload.requested_by_user_id, estimate)
            if estimate_run:
                self._replace_line_items(client, estimate_run["id"], estimate)
                self._replace_insights(client, payload.case_id, estimate_run["id"], estimate)
            self._replace_case_rule_matches(client, payload.case_id, normalized)
            self._complete_processing_job(client, payload.processing_job_id, classified, normalized, estimate)

    def persist_estimate_only(
        self,
        normalized: NormalizedTaxProfile,
        estimate: EstimateResult,
        generated_by: str | None = None,
    ) -> None:
        if not self.enabled:
            return

        with self._client() as client:
            case_row = self._fetch_case(client, normalized.case_id)
            self._update_case_to_processing_complete(client, normalized.case_id, case_row, estimate, generated_by)
            self._persist_tax_profile(client, normalized)
            estimate_run = self._insert_estimate_run(client, normalized.case_id, generated_by, estimate)
            if estimate_run:
                self._replace_line_items(client, estimate_run["id"], estimate)
                self._replace_insights(client, normalized.case_id, estimate_run["id"], estimate)
            self._replace_case_rule_matches(client, normalized.case_id, normalized)

    def mark_processing_job_started(self, processing_job_id: str | None) -> None:
        if not self.enabled or not processing_job_id:
            return
        with self._client() as client:
            self._request(
                client,
                "PATCH",
                "/document_processing_jobs",
                params={"id": f"eq.{processing_job_id}"},
                json={
                    "status": "processing",
                    "started_at": estimate_timestamp(),
                    "updated_at": estimate_timestamp(),
                    "last_error": None,
                },
                prefer="return=minimal",
            )

    def mark_processing_job_failed(self, processing_job_id: str | None, error_message: str) -> None:
        if not self.enabled or not processing_job_id:
            return
        with self._client() as client:
            self._request(
                client,
                "PATCH",
                "/document_processing_jobs",
                params={"id": f"eq.{processing_job_id}"},
                json={
                    "status": "failed",
                    "last_error": error_message[:1000],
                    "completed_at": estimate_timestamp(),
                    "updated_at": estimate_timestamp(),
                },
                prefer="return=minimal",
            )

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

    def _fetch_case(self, client: httpx.Client, case_id: str) -> dict[str, Any] | None:
        response = self._request(
            client,
            "GET",
            "/cases",
            params={"id": f"eq.{case_id}", "select": "id,status,organization_id"},
        )
        rows = response.json()
        return rows[0] if rows else None

    def _upsert_intake_questionnaire(self, client: httpx.Client, payload: CasePayload) -> None:
        intake = payload.intake
        self._request(
            client,
            "POST",
            "/intake_questionnaires",
            params={"on_conflict": "case_id"},
            json={
                "case_id": payload.case_id,
                "filing_status": intake.filing_status,
                "dependents_count": intake.dependents_count,
                "qualifying_child_count": intake.qualifying_child_count,
                "education_expenses": intake.education_expenses,
                "self_employment": intake.self_employment,
                "rental_income": intake.rental_income,
                "state_of_residence": intake.state_of_residence,
                "local_tax_jurisdiction": intake.local_tax_jurisdiction,
                "withholding_notes": intake.withholding_notes,
                "has_1098_t": intake.has_1098_t,
                "consent_accepted": intake.consent_accepted,
                "completed_at": estimate_timestamp(),
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )

    def _update_case_to_processing_complete(
        self,
        client: httpx.Client,
        case_id: str,
        case_row: dict[str, Any] | None,
        estimate: EstimateResult,
        changed_by: str | None,
    ) -> None:
        previous_status = case_row["status"] if case_row else None
        new_status = "review_required"
        self._request(
            client,
            "PATCH",
            "/cases",
            params={"id": f"eq.{case_id}"},
            json={
                "confidence_band": estimate.confidence,
                "status": new_status,
                "updated_at": estimate.generated_at.isoformat(),
            },
            prefer="return=minimal",
        )
        if previous_status != new_status:
            self._request(
                client,
                "POST",
                "/case_status_history",
                json={
                    "case_id": case_id,
                    "previous_status": previous_status,
                    "new_status": new_status,
                    "changed_by": changed_by,
                    "reason": "Document processing and estimate generation completed.",
                },
                prefer="return=minimal",
            )

    def _persist_documents(
        self,
        client: httpx.Client,
        case_id: str,
        classified: list[ClassifiedDocument],
    ) -> None:
        for document in classified:
            update_payload = {
                "form_type": document.form_type,
                "status": map_document_status(document.status),
                "unreadable_reason": document.unreadable_reason,
            }
            self._request(
                client,
                "PATCH",
                "/documents",
                params={"id": f"eq.{document.document_id}"},
                json=update_payload,
                prefer="return=minimal",
            )
            self._request(
                client,
                "DELETE",
                "/extracted_fields",
                params={"document_id": f"eq.{document.document_id}"},
                prefer="return=minimal",
            )
            if document.extracted_fields:
                self._request(
                    client,
                    "POST",
                    "/extracted_fields",
                    json=[
                        {
                            "case_id": case_id,
                            "document_id": document.document_id,
                            "field_name": field.name,
                            "field_value": {"value": field.value},
                            "source_label": field.source_label,
                            "extraction_confidence": field.confidence,
                            "manually_overridden": False,
                            "review_status": "pending",
                            "normalization_target": field.normalization_target,
                        }
                        for field in document.extracted_fields
                    ],
                    prefer="return=minimal",
                )

    def _persist_tax_profile(self, client: httpx.Client, normalized: NormalizedTaxProfile) -> None:
        self._request(
            client,
            "POST",
            "/tax_profiles",
            params={"on_conflict": "case_id"},
            json={
                "case_id": normalized.case_id,
                "normalized_json": normalized.model_dump(mode="json"),
                "assumptions": normalized.assumptions,
                "missing_items": normalized.missing_items,
                "warnings": normalized.warnings,
                "version": settings.estimation_engine_version,
                "updated_at": estimate_timestamp(),
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )

    def _insert_estimate_run(
        self,
        client: httpx.Client,
        case_id: str,
        generated_by: str | None,
        estimate: EstimateResult,
    ) -> dict[str, Any] | None:
        response = self._request(
            client,
            "POST",
            "/estimate_runs",
            json={
                "case_id": case_id,
                "engine_version": estimate.engine_version,
                "estimated_federal_refund_or_due": estimate.estimated_federal_refund_or_due,
                "estimated_state_refund_or_due": estimate.estimated_state_refund_or_due,
                "confidence_band": estimate.confidence,
                "assumptions": estimate.assumptions,
                "missing_data_warnings": estimate.missing_data_warnings,
                "human_review_required": estimate.human_review_required,
                "generated_by": generated_by,
                "confidence_reasons": [item.model_dump() for item in estimate.confidence_reasons],
                "client_insights": estimate.client_insights,
                "internal_insights": estimate.internal_insights,
                "citations": [item.model_dump() for item in estimate.citations],
            },
            prefer="return=representation",
        )
        rows = response.json()
        return rows[0] if rows else None

    def _replace_line_items(self, client: httpx.Client, estimate_run_id: str, estimate: EstimateResult) -> None:
        self._request(
            client,
            "DELETE",
            "/estimate_line_items",
            params={"estimate_run_id": f"eq.{estimate_run_id}"},
            prefer="return=minimal",
        )
        self._request(
            client,
            "POST",
            "/estimate_line_items",
            json=[
                {
                    "estimate_run_id": estimate_run_id,
                    "label": item.label,
                    "amount": item.amount,
                    "category": item.category,
                    "note": item.note,
                }
                for item in estimate.line_items
            ],
            prefer="return=minimal",
        )

    def _replace_insights(
        self,
        client: httpx.Client,
        case_id: str,
        estimate_run_id: str,
        estimate: EstimateResult,
    ) -> None:
        self._request(
            client,
            "DELETE",
            "/insights",
            params={"case_id": f"eq.{case_id}"},
            prefer="return=minimal",
        )
        rows = [
            {
                "case_id": case_id,
                "estimate_run_id": estimate_run_id,
                "audience": "client",
                "content": item,
            }
            for item in estimate.client_insights
        ] + [
            {
                "case_id": case_id,
                "estimate_run_id": estimate_run_id,
                "audience": "internal",
                "content": item,
            }
            for item in estimate.internal_insights
        ]
        if rows:
            self._request(client, "POST", "/insights", json=rows, prefer="return=minimal")

    def _replace_case_rule_matches(
        self,
        client: httpx.Client,
        case_id: str,
        normalized: NormalizedTaxProfile,
    ) -> None:
        response = self._request(client, "GET", "/rule_cards", params={"select": "id,scope_tag,title"})
        rule_cards = response.json()
        scope_to_id = {row["scope_tag"]: row["id"] for row in rule_cards}
        answer = self.research.ask(
            question={
                "question": "Auto-match case rules for internal preparer review.",
                "case_facts": normalized.model_dump(mode="json"),
            }
        )
        self._request(
            client,
            "DELETE",
            "/case_rule_matches",
            params={"case_id": f"eq.{case_id}"},
            prefer="return=minimal",
        )
        rows = []
        for card in answer.related_rule_cards:
            rule_card_id = scope_to_id.get(card.scope_tag)
            if not rule_card_id:
                continue
            rows.append(
                {
                    "case_id": case_id,
                    "rule_card_id": rule_card_id,
                    "severity": "warning" if card.scope_tag in {"education", "withholding"} else "info",
                    "explanation": card.summary,
                    "status": "open",
                }
            )
        if rows:
            self._request(client, "POST", "/case_rule_matches", json=rows, prefer="return=minimal")

    def _complete_processing_job(
        self,
        client: httpx.Client,
        processing_job_id: str | None,
        classified: list[ClassifiedDocument],
        normalized: NormalizedTaxProfile,
        estimate: EstimateResult,
    ) -> None:
        if not processing_job_id:
            return
        self._request(
            client,
            "PATCH",
            "/document_processing_jobs",
            params={"id": f"eq.{processing_job_id}"},
            json={
                "status": "completed",
                "result_payload": {
                    "classified_documents": [item.model_dump(mode="json") for item in classified],
                    "normalized_profile": normalized.model_dump(mode="json"),
                    "estimate": estimate.model_dump(mode="json"),
                },
                "completed_at": estimate.generated_at.isoformat(),
                "updated_at": estimate.generated_at.isoformat(),
                "last_error": None,
            },
            prefer="return=minimal",
        )


def map_document_status(status: str) -> str:
    if status == "conflicting":
        return "review_needed"
    return status


def estimate_timestamp() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
