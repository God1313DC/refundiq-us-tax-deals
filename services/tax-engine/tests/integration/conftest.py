from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

import httpx
import pytest


ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = ROOT / "services" / "tax-engine" / "tests" / "fixtures" / "live_case_payload.json"


def pytest_collection_modifyitems(config, items):
    if os.getenv("RUN_LIVE_INTEGRATION_TESTS") == "true":
        return
    skip_live = pytest.mark.skip(reason="Set RUN_LIVE_INTEGRATION_TESTS=true to run live integration tests.")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip_live)


@pytest.fixture()
def live_config() -> dict[str, str]:
    return {
        "api_base_url": os.getenv("LIVE_API_BASE_URL", os.getenv("FASTAPI_BASE_URL", "http://localhost:8000")),
        "web_base_url": os.getenv("LIVE_WEB_BASE_URL", os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")),
        "supabase_url": os.getenv("LIVE_SUPABASE_URL", os.getenv("SUPABASE_URL", "")),
        "supabase_service_role_key": os.getenv("LIVE_SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")),
    }


@pytest.fixture()
def fixture_payload() -> dict[str, Any]:
    return json.loads(FIXTURE_PATH.read_text())


@pytest.fixture()
def supabase_rest_client(live_config: dict[str, str]) -> httpx.Client:
    if not live_config["supabase_url"] or not live_config["supabase_service_role_key"]:
        pytest.skip("Live Supabase URL and service role key are required for integration persistence tests.")
    return httpx.Client(
        base_url=f"{live_config['supabase_url']}/rest/v1",
        timeout=30,
        headers={
            "apikey": live_config["supabase_service_role_key"],
            "Authorization": f"Bearer {live_config['supabase_service_role_key']}",
            "Content-Type": "application/json",
        },
    )


@pytest.fixture()
def api_client(live_config: dict[str, str]) -> httpx.Client:
    return httpx.Client(base_url=live_config["api_base_url"], timeout=60)


@pytest.fixture()
def web_client(live_config: dict[str, str]) -> httpx.Client:
    return httpx.Client(base_url=live_config["web_base_url"], timeout=30)


def _request(client: httpx.Client, method: str, path: str, **kwargs) -> httpx.Response:
    response = client.request(method, path, **kwargs)
    response.raise_for_status()
    return response


@pytest.fixture()
def live_case_setup(supabase_rest_client: httpx.Client, fixture_payload: dict[str, Any]) -> dict[str, Any]:
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    case_id = str(uuid.uuid4())
    document_rows = []

    _request(
      supabase_rest_client,
      "POST",
      "/organizations",
      params={"on_conflict": "slug"},
      headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
      json={"id": org_id, "name": "US Tax Deals Integration", "slug": f"us-tax-deals-integration-{case_id[:8]}"},
    )
    _request(
      supabase_rest_client,
      "POST",
      "/users",
      headers={"Prefer": "return=minimal"},
      json={"id": user_id, "organization_id": org_id, "full_name": fixture_payload["client_name"], "email": f"{case_id[:8]}@ustaxdeals.test", "role": "client"},
    )
    _request(
      supabase_rest_client,
      "POST",
      "/cases",
      headers={"Prefer": "return=minimal"},
      json={
          "id": case_id,
          "organization_id": org_id,
          "client_user_id": user_id,
          "case_number": f"RIQ-LIVE-{case_id[:8].upper()}",
          "tax_year": fixture_payload["tax_year"],
          "status": "processing",
          "confidence_band": "low",
          "filing_status": fixture_payload["intake"]["filing_status"],
          "state_of_residence": fixture_payload["intake"]["state_of_residence"],
      },
    )

    for index, document in enumerate(fixture_payload["documents"], start=1):
        document_id = str(uuid.uuid4())
        _request(
            supabase_rest_client,
            "POST",
            "/documents",
            headers={"Prefer": "return=minimal"},
            json={
                "id": document_id,
                "case_id": case_id,
                "uploaded_by": user_id,
                "file_name": document["file_name"],
                "file_path": f"tests/{case_id}/{document['file_name']}",
                "mime_type": document["mime_type"],
                "status": "processing",
                "checksum": f"fixture-{index}",
                "encrypted_at_rest": True,
                "consent_recorded": True,
            },
        )
        document_rows.append(
            {
                "document_id": document_id,
                "file_name": document["file_name"],
                "mime_type": document["mime_type"],
                "uploaded_by": document["uploaded_by"],
                "checksum": f"fixture-{index}",
                "storage_path": f"tests/{case_id}/{document['file_name']}",
                "content_text": document["content_text"],
            }
        )

    processing_job_id = str(uuid.uuid4())
    _request(
        supabase_rest_client,
        "POST",
        "/document_processing_jobs",
        headers={"Prefer": "return=minimal"},
        json={
            "id": processing_job_id,
            "case_id": case_id,
            "status": "queued",
            "created_by": user_id,
            "result_payload": {},
        },
    )

    yield {
        "organization_id": org_id,
        "user_id": user_id,
        "case_id": case_id,
        "processing_job_id": processing_job_id,
        "payload": {
            "case_id": case_id,
            "client_name": fixture_payload["client_name"],
            "tax_year": fixture_payload["tax_year"],
            "processing_job_id": processing_job_id,
            "requested_by_user_id": user_id,
            "intake": fixture_payload["intake"],
            "documents": document_rows,
        },
    }

    for table, identifier in [
        ("document_processing_jobs", processing_job_id),
        ("documents", None),
        ("cases", case_id),
        ("users", user_id),
        ("organizations", org_id),
    ]:
        if table == "documents":
            _request(supabase_rest_client, "DELETE", f"/{table}", params={"case_id": f"eq.{case_id}"}, headers={"Prefer": "return=minimal"})
        else:
            _request(supabase_rest_client, "DELETE", f"/{table}", params={"id": f"eq.{identifier}"}, headers={"Prefer": "return=minimal"})
