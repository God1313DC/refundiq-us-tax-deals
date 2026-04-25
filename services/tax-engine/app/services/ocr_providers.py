from __future__ import annotations

from io import BytesIO
from dataclasses import dataclass

import httpx
import pytesseract
from PIL import Image, ImageOps
from pypdf import PdfReader

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

    def _download_storage_bytes(self, document: UploadedDocument) -> bytes | None:
        if not document.storage_path:
            return None

        base_url = settings.effective_supabase_url
        service_key = settings.supabase_service_role_key
        if not base_url or not service_key:
            return None

        object_path = document.storage_path.lstrip("/")
        url = f"{base_url}/storage/v1/object/{settings.supabase_storage_bucket}/{object_path}"

        try:
            response = httpx.get(
                url,
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                },
                timeout=20,
            )
            response.raise_for_status()
            return response.content
        except Exception:
            return None

    def _extract_pdf_text(self, document: UploadedDocument) -> str:
        pdf_bytes = self._download_storage_bytes(document)
        if not pdf_bytes:
            return ""

        try:
            reader = PdfReader(BytesIO(pdf_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(part.strip() for part in pages if part.strip())
        except Exception:
            return ""


class StubOCRProvider(BaseOCRProvider):
    name = "stub"

    def extract(self, document: UploadedDocument) -> OCRProviderResult:
        if document.content_text:
            return OCRProviderResult(text=document.content_text, confidence=0.98, provider=self.name)
        if document.mime_type == "application/pdf":
            pdf_text = self._extract_pdf_text(document)
            if pdf_text:
                return OCRProviderResult(text=pdf_text, confidence=0.82, provider=f"{self.name}_pdf")
        if document.mime_type.startswith("text/"):
            return OCRProviderResult(text=document.content_text or "", confidence=0.92, provider=self.name)
        return OCRProviderResult(text=f"OCR placeholder for {document.file_name}", confidence=0.35, provider=self.name)


class TesseractOCRProvider(BaseOCRProvider):
    name = "tesseract"

    def _extract_image_text(self, document: UploadedDocument) -> str:
        image_bytes = self._download_storage_bytes(document)
        if not image_bytes:
            return ""

        try:
            image = Image.open(BytesIO(image_bytes))
            image = ImageOps.exif_transpose(image)
            image = image.convert("L")
            image = ImageOps.autocontrast(image)
            image = image.resize((image.width * 2, image.height * 2))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception:
            return ""

    def extract(self, document: UploadedDocument) -> OCRProviderResult:
        if document.content_text:
            return OCRProviderResult(text=document.content_text, confidence=0.98, provider=self.name)
        if document.mime_type == "application/pdf":
            pdf_text = self._extract_pdf_text(document)
            if pdf_text:
                return OCRProviderResult(text=pdf_text, confidence=0.86, provider=f"{self.name}_pdf")
        if document.mime_type.startswith("image/"):
            image_text = self._extract_image_text(document)
            if image_text:
                return OCRProviderResult(text=image_text, confidence=0.72, provider=f"{self.name}_image")
        if document.mime_type.startswith("text/"):
            return OCRProviderResult(text=document.content_text or "", confidence=0.92, provider=self.name)
        return StubOCRProvider().extract(document)


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
    if provider == "tesseract":
        return TesseractOCRProvider()
    return StubOCRProvider()
