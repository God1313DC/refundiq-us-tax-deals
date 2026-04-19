from app.api.routes.exports import _build_export_payload


def test_export_payload_has_safe_fallback_when_repository_unavailable(monkeypatch):
    monkeypatch.setattr("app.api.routes.exports.repository.fetch_case_export_bundle", lambda case_id: None)
    payload = _build_export_payload("case-123")

    assert payload["case_id"] == "case-123"
    assert "missing_items" in payload
    assert "warnings" in payload
