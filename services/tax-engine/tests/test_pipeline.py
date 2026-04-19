from app.schemas import CasePayload, IntakeAnswers, UploadedDocument
from app.services.document_pipeline import DocumentPipeline


def test_pipeline_marks_unknown_images_as_unreadable():
    payload = CasePayload(
        case_id="case-image-unreadable",
        client_name="Image Test",
        tax_year=2025,
        intake=IntakeAnswers(filing_status="single", state_of_residence="Texas", consent_accepted=True),
        documents=[
            UploadedDocument(
                document_id="doc-image",
                file_name="mobile-upload.jpg",
                mime_type="image/jpeg",
                uploaded_by="client",
            )
        ],
    )

    pipeline = DocumentPipeline()
    classified, normalized = pipeline.process(payload)

    assert classified[0].status == "unreadable"
    assert normalized.warnings


def test_pipeline_does_not_flag_multiple_supported_income_docs_as_duplicates_by_type_alone():
    payload = CasePayload(
        case_id="case-two-w2s",
        client_name="Two W2s",
        tax_year=2025,
        intake=IntakeAnswers(filing_status="single", state_of_residence="Texas", consent_accepted=True),
        documents=[
            UploadedDocument(
                document_id="doc-1",
                file_name="employer-one-w2.txt",
                mime_type="text/plain",
                uploaded_by="client",
                content_text="Wages 30000 Federal Withholding 3000 State Wages 30000",
            ),
            UploadedDocument(
                document_id="doc-2",
                file_name="employer-two-w2.txt",
                mime_type="text/plain",
                uploaded_by="client",
                content_text="Wages 25000 Federal Withholding 2500 State Wages 25000",
            ),
        ],
    )

    pipeline = DocumentPipeline()
    classified, _ = pipeline.process(payload)

    assert all(item.status == "processed" for item in classified)
