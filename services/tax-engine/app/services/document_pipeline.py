from __future__ import annotations

from app.schemas import CasePayload, ClassifiedDocument
from app.services.dedup import detect_duplicates
from app.services.document_classifier import DocumentClassifier
from app.services.extractors import FieldExtractor
from app.services.normalizer import TaxProfileNormalizer
from app.services.ocr import OCRService


class DocumentPipeline:
    def __init__(self) -> None:
        self.classifier = DocumentClassifier()
        self.ocr = OCRService()
        self.extractor = FieldExtractor()
        self.normalizer = TaxProfileNormalizer()

    def process(self, payload: CasePayload) -> tuple[list[ClassifiedDocument], object]:
        classified: list[ClassifiedDocument] = []

        for document in payload.documents:
            form_type, confidence = self.classifier.classify(document)
            text = self.ocr.extract_text(document)
            extracted_fields = self.extractor.extract(
                document_id=document.document_id,
                form_type=form_type,
                text=text,
            )

            status = "processed" if extracted_fields or form_type in {"id_document", "prior_year_return"} else "review_needed"
            unreadable_reason = None
            if form_type in {"unclassified", "unknown_image"} and not document.declared_form_type:
                status = "unreadable"
                unreadable_reason = (
                    "Uploaded image could not be read well enough for classification."
                    if form_type == "unknown_image"
                    else "Classifier could not identify a supported form type."
                )
            elif document.declared_form_type and not extracted_fields and form_type not in {"id_document", "prior_year_return", "supporting_document"}:
                status = "review_needed"
                unreadable_reason = "The document type was identified from your upload choice, but the figures still need review or stronger OCR."
            elif confidence < 0.5 and not extracted_fields:
                status = "review_needed"
                unreadable_reason = "Low-confidence classification. Reviewer should confirm form type and readability."

            classified.append(
                ClassifiedDocument(
                    document_id=document.document_id,
                    file_name=document.file_name,
                    form_type=form_type,
                    confidence=confidence,
                    status=status,
                    extracted_fields=extracted_fields,
                    unreadable_reason=unreadable_reason,
                )
            )

        classified = detect_duplicates(classified)
        for document in classified:
            if document.conflicts_with:
                document.status = "conflicting"
            if document.duplicate_of:
                document.status = "duplicate"
        normalized = self.normalizer.normalize(payload, classified)
        if any(item.status in {"unreadable", "conflicting", "duplicate"} for item in classified):
            normalized.warnings.append("One or more uploaded documents require reviewer attention.")
        return classified, normalized
