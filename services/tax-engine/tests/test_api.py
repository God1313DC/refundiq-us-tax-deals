from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "queues" in response.json()


def test_readycheck():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_research_endpoint_returns_citations():
    response = client.post(
        "/v1/research/ask",
        json={
            "question": "What should we cite for standard deduction logic?",
            "case_facts": {"federal_withholding": 6150},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["citations"]
    assert body["human_review_required"] is True
    assert body["answer_mode"]


def test_rerun_from_profile_endpoint_returns_estimate():
    response = client.post(
        "/v1/estimates/rerun-from-profile",
        json={
            "normalized_profile": {
                "case_id": "case-test-rerun",
                "tax_year": 2025,
                "filing_status": "single",
                "state_of_residence": "Texas",
                "wages": 60000,
                "federal_withholding": 7000,
                "state_withholding": 0,
                "interest_income": 0,
                "dividend_income": 0,
                "misc_income": 0,
                "nonemployee_compensation": 0,
                "self_employment_expenses": 0,
                "tuition_paid": 0,
                "scholarships": 0,
                "mortgage_interest": 0,
                "dependents_count": 0,
                "qualifying_child_count": 0,
                "assumptions": [],
                "assumptions_detail": [],
                "missing_items": [],
                "warnings": [],
                "warning_details": [],
                "source_map": {}
            },
            "persist_result": False
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["estimate"]["human_review_required"] is True
    assert "estimated_federal_refund_or_due" in body["estimate"]
