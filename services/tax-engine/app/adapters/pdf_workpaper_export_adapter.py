from __future__ import annotations

from app.adapters.summary_utils import build_manual_entry_summary, build_workpaper_sections


def export(case_id: str, payload: dict) -> dict:
    sections = build_workpaper_sections(case_id, payload)
    rendered = [
        "RefundIQ Internal Workpaper",
        f"Case: {case_id}",
        "",
    ]
    for title, rows in sections:
        rendered.append(title)
        rendered.extend([f"- {row}" for row in rows])
        rendered.append("")

    return {
        "adapter": "pdf_workpaper_export_adapter",
        "case_id": case_id,
        "status": "ready",
        "filename": f"{case_id}-workpaper.pdf",
        "message": "Structured preparer-facing workpaper placeholder generated from the saved normalized profile, estimate trace, and review context.",
        "render_format": "structured-text-pdf-placeholder",
        "workpaper_text": "\n".join(rendered).strip(),
        "manual_entry_summary": build_manual_entry_summary(case_id, payload),
    }
