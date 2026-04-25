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
                file_name="employee-w-2.pdf",
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

    assert estimate.estimated_federal_refund_or_due == 1270.5
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


def test_estimate_engine_applies_supported_education_credit_with_phaseout_logic():
    payload = CasePayload(
        case_id="case-test-1098t",
        client_name="Jordan Miles",
        tax_year=2025,
        intake=IntakeAnswers(
            filing_status="single",
            state_of_residence="Texas",
            has_1098_t=True,
            consent_accepted=True,
        ),
        documents=[
            UploadedDocument(
                document_id="doc-w2",
                file_name="employee-w-2.pdf",
                mime_type="application/pdf",
                uploaded_by="client",
                content_text="Wages 42000 Federal Withholding 3100",
            ),
            UploadedDocument(
                document_id="doc-1098t",
                file_name="student-1098-t.pdf",
                mime_type="application/pdf",
                uploaded_by="client",
                content_text="Payments received for qualified tuition and related expenses 4000 Scholarships 500",
            ),
        ],
    )

    pipeline = DocumentPipeline()
    estimator = TaxEstimator()
    _, normalized = pipeline.process(payload)
    estimate = estimator.run(normalized)

    education_credit_item = next(item for item in estimate.line_items if item.label == "Estimated education credit")
    assert education_credit_item.amount == 2375.0
    assert estimate.estimated_federal_refund_or_due > 0


def test_estimate_engine_marks_unsupported_rental_scenarios_low_confidence():
    payload = CasePayload(
        case_id="case-test-rental",
        client_name="Jordan Miles",
        tax_year=2025,
        intake=IntakeAnswers(
            filing_status="single",
            state_of_residence="Texas",
            rental_income=True,
            consent_accepted=True,
        ),
        documents=[
            UploadedDocument(
                document_id="doc-w2",
                file_name="employee-w-2.pdf",
                mime_type="application/pdf",
                uploaded_by="client",
                content_text="Wages 72000 Federal Withholding 5000",
            )
        ],
    )

    pipeline = DocumentPipeline()
    estimator = TaxEstimator()
    _, normalized = pipeline.process(payload)
    estimate = estimator.run(normalized)

    assert estimate.confidence == "low"
    assert any(item.code == "rental-income-unsupported" for item in estimate.warning_details)
