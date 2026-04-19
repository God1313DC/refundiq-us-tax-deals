# Production Hardening TODO

- Add generated Supabase TypeScript types for all tables and nested queries
- Replace demo fallback reads with fully enforced live-data paths in all routes
- Add true OCR provider integration and classifier confidence calibration
- Persist Python processing and estimate results directly back into Supabase
- Add signed document preview revocation and download audit events
- Add MFA and stronger admin session controls
- Add rate limiting, CSRF review, and abuse monitoring for auth and upload routes
- Add state-tax modules with reviewed jurisdiction-specific rules
- Add PDF rendering for workpapers instead of text summary placeholder
- Add a reviewed source-monitoring ingestion job for IRS and state updates
