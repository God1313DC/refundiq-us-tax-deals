from __future__ import annotations


def export(case_id: str) -> dict:
    return {
        "adapter": "drake_portal_adapter",
        "case_id": case_id,
        "status": "placeholder",
        "message": "Portal integration remains adapter-only until an approved workflow is defined.",
    }
