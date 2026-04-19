from __future__ import annotations

from app.schemas import UploadedDocument
from app.services.ocr_providers import get_ocr_provider


class OCRService:
    """Provider-backed OCR facade.

    The default provider remains a safe stub/mock path for local testing. Production
    deployments can supply a stronger provider through configuration without changing
    the document pipeline contract.
    """

    def __init__(self) -> None:
        self.provider = get_ocr_provider()

    def extract_text(self, document: UploadedDocument) -> str:
        return self.provider.extract(document).text
