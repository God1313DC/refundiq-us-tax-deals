# Staging Deployment Notes

## Intended staging posture

- Supabase auth, database, and storage should point to a staging project
- FastAPI, worker, and scheduler should share the same environment values
- Redis should be isolated to staging only
- All staging results must still be labeled as estimated until human review

## Required external services

- Supabase project with service-role key
- Private storage bucket for tax documents
- Redis instance

## Recommended staging checks

- `/health` and `/ready` return healthy responses
- `/api/health` returns `ok` or a clear degraded state from the web tier
- client signup/login works
- password reset emails are configured
- upload creates `documents`, `document_versions`, and `document_processing_jobs`
- worker consumes queued jobs and persists results back into Supabase
- internal case review page loads fresh DB-backed values
- admin sync-now action creates or updates `source_ingestion_jobs`
- live verification scripts complete successfully

## Staging verification commands

```bash
npm run smoke:health
npm run verify:live-stack
RUN_LIVE_INTEGRATION_TESTS=true npm run test:integration:live
```

## Safe placeholders still expected in staging

- Drake adapters remain manual-handoff oriented
- OCR provider may still run in stub or mock mode unless a real provider is configured
- PDF exports remain structured placeholders unless a rendering backend is added
