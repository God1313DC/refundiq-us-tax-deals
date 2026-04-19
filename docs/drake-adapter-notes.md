# Drake Adapter Notes

RefundIQ preserves Drake-oriented workflow support without pretending that Drake exposes a public refund-calculation API.

## Current adapters

- `drake_documents_adapter`
- `drake_portal_adapter`
- `csv_export_adapter`
- `pdf_workpaper_export_adapter`
- `manual_review_queue_adapter`

## What is real today

- Normalized case data can be structured for export
- Manual-entry summaries can be generated for preparer handoff
- CSV and summary-oriented workpaper outputs are supported as internal workflow artifacts
- Internal exports are logged into `integration_exports` for auditability and staging tests

## What remains placeholder

- Direct Drake Documents integration
- Direct Drake Portals integration
- Any Drake-hosted tax computation path

## Safe extension path

- Keep adapters isolated behind explicit interface boundaries
- Add firm-specific Drake export mapping only when documentation or authorized integration details are available
- Preserve manual entry and workpaper generation even if deeper Drake integration is unavailable
