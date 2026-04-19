from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.schemas import UploadedDocument


@dataclass
class OCRProviderResult:
    text: str
    confidence: float
    provider: str


class BaseOCRProvider:
    name = "base"

    def extract(self, document: UploadedDocument) -> OCRProviderResult:  # pragma: no cover - interface
        raise NotImplementedError


class StubOCRProvider(BaseOCRProvider):
    name = "stub"

    def extract(self, document: UploadedDocument) -> OCRProviderResult:
        if document.content_text:
            return OCRProviderResult(text=document.content_text, confidence=0.98, provider=self.name)
        if document.mime_type.startswith("text/"):
            return OCRProviderResult(text=document.content_text or "", confidence=0.92, provider=self.name)
        return OCRProviderResult(text=f"OCR placeholder for {document.file_name}", confidence=0.35, provider=self.name)


class MockStructuredOCRProvider(BaseOCRProvider):
    name = "mock_structured"

    def extract(self, document: UploadedDocument) -> OCRProviderResult:
        prefix = "Mock OCR extracted"
        if document.content_text:
            return OCRProviderResult(text=document.content_text, confidence=0.99, provider=self.name)
        return OCRProviderResult(
            text=f"{prefix} text for {document.file_name}. Review required before relying on any extracted fields.",
            confidence=0.65,
            provider=self.name,
        )


def get_ocr_provider() -> BaseOCRProvider:
    provider = settings.ocr_provider.lower().strip()
    if provider == "mock_structured":
        return MockStructuredOCRProvider()
    return StubOCRProvider()
