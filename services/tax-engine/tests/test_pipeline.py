from app.schemas import CasePayload, ClassifiedDocument, ExtractedField, IntakeAnswers, UploadedDocument
from app.services.document_pipeline import DocumentPipeline
from app.services.normalizer import TaxProfileNormalizer


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
                    declared_form_type="w2",
                    mime_type="text/plain",
                    uploaded_by="client",
                    content_text="1 Wages, tips, other compensation 2 Federal income tax withheld 30000.00 3000.00 16 State wages, tips, etc. 17 State income tax 30000.00 1200.00",
                ),
                UploadedDocument(
                    document_id="doc-2",
                    file_name="employer-two-w2.txt",
                    declared_form_type="w2",
                    mime_type="text/plain",
                    uploaded_by="client",
                    content_text="1 Wages, tips, other compensation 2 Federal income tax withheld 25000.00 2500.00 16 State wages, tips, etc. 17 State income tax 25000.00 1000.00",
                ),
        ],
    )

    pipeline = DocumentPipeline()
    classified, _ = pipeline.process(payload)

    assert all(item.status == "processed" for item in classified)


def test_normalizer_excludes_non_processed_documents_from_totals():
    payload = CasePayload(
        case_id="case-status-filter",
        client_name="Status Filter",
        tax_year=2025,
        intake=IntakeAnswers(filing_status="single", state_of_residence="Pennsylvania", consent_accepted=True),
        documents=[],
    )

    classified = [
        ClassifiedDocument(
            document_id="doc-good",
            file_name="good-w2.txt",
            form_type="w2",
            confidence=0.95,
            status="processed",
            extracted_fields=[
                ExtractedField(
                    name="wages",
                    value=3000,
                    source_document_id="doc-good",
                    source_label="wages",
                    confidence=0.95,
                ),
                ExtractedField(
                    name="state_withholding",
                    value=100,
                    source_document_id="doc-good",
                    source_label="state withholding",
                    confidence=0.95,
                ),
            ],
        ),
        ClassifiedDocument(
            document_id="doc-review",
            file_name="unclear.jpg",
            form_type="w2",
            confidence=0.4,
            status="review_needed",
            extracted_fields=[],
            unreadable_reason="Need stronger OCR",
        ),
        ClassifiedDocument(
            document_id="doc-duplicate",
            file_name="good-w2-copy.txt",
            form_type="w2",
            confidence=0.95,
            status="duplicate",
            extracted_fields=[
                ExtractedField(
                    name="wages",
                    value=3000,
                    source_document_id="doc-duplicate",
                    source_label="wages",
                    confidence=0.95,
                )
            ],
            duplicate_of="doc-good",
        ),
    ]

    normalized = TaxProfileNormalizer().normalize(payload, classified)

    assert normalized.wages == 3000
    assert normalized.state_withholding == 100
    assert any("excluded" in warning.lower() for warning in normalized.warnings)
