from __future__ import annotations

import time

import pytest


pytestmark = [pytest.mark.live]


def test_web_and_api_health_endpoints(web_client, api_client):
    web_health = web_client.get("/api/health")
    api_health = api_client.get("/health")
    api_ready = api_client.get("/ready")

    assert web_health.status_code == 200
    assert api_health.status_code == 200
    assert api_ready.status_code == 200


def test_processing_roundtrip_persists_results(api_client, supabase_rest_client, live_case_setup):
    response = api_client.post("/v1/documents/process", json=live_case_setup["payload"])
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"queued", "completed"}

    case_id = live_case_setup["case_id"]
    processing_job_id = live_case_setup["processing_job_id"]

    deadline = time.time() + 45
    completed = False
    while time.time() < deadline:
      job_response = supabase_rest_client.get(
          "/document_processing_jobs",
          params={"id": f"eq.{processing_job_id}", "select": "status,last_error,result_payload"},
      )
      job_response.raise_for_status()
      rows = job_response.json()
      if rows and rows[0]["status"] == "completed":
          completed = True
          break
      time.sleep(2)

    assert completed is True

    tax_profile_response = supabase_rest_client.get(
        "/tax_profiles",
        params={"case_id": f"eq.{case_id}", "select": "id,normalized_json"},
    )
    estimate_response = supabase_rest_client.get(
        "/estimate_runs",
        params={"case_id": f"eq.{case_id}", "select": "id,confidence_band,human_review_required"},
    )
    fields_response = supabase_rest_client.get(
        "/extracted_fields",
        params={"case_id": f"eq.{case_id}", "select": "id,field_name,review_status"},
    )

    assert tax_profile_response.json()
    assert estimate_response.json()
    assert fields_response.json()


def test_research_ingestion_and_admin_flow_endpoints(api_client):
    run_response = api_client.post("/v1/research/ingestion/run", json={"run_type": "manual", "limit": 1})
    assert run_response.status_code == 200
    body = run_response.json()
    assert body["status"] in {"queued", "completed_inline"}


def test_research_answer_and_export_endpoints(api_client):
    research = api_client.post(
        "/v1/research/ask",
        json={
            "question": "What should preparers verify for education credit estimates?",
            "case_facts": {"tuition_paid": 1200, "has_1098_t": True},
        },
    )
    assert research.status_code == 200
    assert research.json()["citations"]


def test_export_generation_endpoint(api_client, live_case_setup):
    response = api_client.post(
        f"/v1/exports/{live_case_setup['case_id']}",
        json={
            "case_id": live_case_setup["case_id"],
            "export_type": "manual_review_queue_adapter",
            "requested_by": live_case_setup["user_id"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["adapter"] == "manual_review_queue_adapter"
