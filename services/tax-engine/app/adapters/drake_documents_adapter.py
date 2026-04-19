from __future__ import annotations


def export(case_id: str) -> dict:
    return {
        "adapter": "drake_documents_adapter",
        "case_id": case_id,
        "status": "placeholder",
        "message": "No public Drake documents API is assumed. Export remains manual/copy-ready for now.",
    }
