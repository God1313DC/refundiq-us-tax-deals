# Local Dev Runbook

## What you need

- Node.js 22+
- Python 3.12+
- Docker and Docker Compose
- A Supabase project with the RefundIQ schema migrated and storage bucket created

## Recommended startup path

1. Copy `.env.example` to `.env` and fill in Supabase values.
2. Run database migrations in Supabase and load `supabase/seed.sql` for test data.
3. Start the app stack:

```bash
./scripts/boot-local-stack.sh
```

4. Open:

- Web: `http://localhost:3000`
- Web health: `http://localhost:3000/api/health`
- API health: `http://localhost:8000/health`
- API readiness: `http://localhost:8000/ready`

Health notes:

- `/health` reports Redis connectivity, queue depths, OCR provider mode, scheduler enablement, and whether Supabase server config is present.
- `/api/health` confirms the Next.js layer can reach the FastAPI service.

## Services in the local stack

- `web`: Next.js client, internal, and admin UI
- `api`: FastAPI tax engine, exports, and research API
- `worker`: RQ worker for document-processing and source-ingestion queues
- `scheduler`: optional recurring source-ingestion trigger
- `redis`: queue backend

## Main happy path

1. Sign up as a client.
2. Complete the intake questionnaire.
3. Upload a supported document with consent checked.
4. Confirm a `document_processing_jobs` row is created and progresses.
5. Open the internal dashboard as a preparer/admin user.
6. Review extracted fields, rule alerts, and estimate outputs.
7. Override a field and rerun the estimate.
8. Save a research answer resolution if the case uses internal tax research.
9. Generate a Drake/manual handoff export from the case page.

## Optional integration verification

- Run smoke checks:

```bash
npm run smoke:health
```

- Run stack verification:

```bash
npm run verify:live-stack
```

- Load safe fixture data if you want predictable test users and a starter case:

`supabase/test-fixtures.sql`

- Run live API integration scaffolding:

```bash
RUN_LIVE_INTEGRATION_TESTS=true npm run test:integration:live
```

- Run browser E2E scaffolding:

```bash
RUN_WEB_E2E=true npm run test:e2e:web
```
