from __future__ import annotations

import csv
import io

def export(case_id: str, payload: dict) -> dict:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(payload.keys()))
    writer.writeheader()
    writer.writerow(payload)

    return {
        "adapter": "csv_export_adapter",
        "case_id": case_id,
        "status": "ready",
        "filename": f"{case_id}-normalized-tax-data.csv",
        "preview_columns": list(payload.keys()),
        "csv_preview": buffer.getvalue(),
        "normalized_json": payload,
    }
