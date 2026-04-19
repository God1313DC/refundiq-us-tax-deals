from app.schemas import CasePayload, IntakeAnswers, UploadedDocument
from app.services.document_pipeline import DocumentPipeline
from app.services.rules.engine import TaxEstimator


def test_estimate_engine_supports_basic_w2_refund_scenario():
    payload = CasePayload(
        case_id="case-test-w2",
        client_name="Jordan Miles",
        tax_year=2025,
        intake=IntakeAnswers(
            filing_status="single",
            state_of_residence="Texas",
            consent_accepted=True,
        ),
        documents=[
            UploadedDocument(
                document_id="doc-1",
                file_name="employee-w2.pdf",
                mime_type="application/pdf",
                uploaded_by="client",
                content_text="Wages 58400 Federal Withholding 6150 State Wages 58400",
            )
        ],
    )

    pipeline = DocumentPipeline()
    estimator = TaxEstimator()
    _, normalized = pipeline.process(payload)
    estimate = estimator.run(normalized)

    assert estimate.estimated_federal_refund_or_due > 0
    assert estimate.human_review_required is True
    assert estimate.line_items


def test_estimate_engine_downgrades_confidence_when_documents_are_missing():
    payload = CasePayload(
        case_id="case-test-edu",
        client_name="Jordan Miles",
        tax_year=2025,
        intake=IntakeAnswers(
            filing_status="single",
            state_of_residence="Texas",
            has_1098_t=True,
            consent_accepted=True,
        ),
        documents=[],
    )

    pipeline = DocumentPipeline()
    estimator = TaxEstimator()
    _, normalized = pipeline.process(payload)
    estimate = estimator.run(normalized)

    assert estimate.confidence in {"medium", "low"}
    assert estimate.missing_data_warnings
