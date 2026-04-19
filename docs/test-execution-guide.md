# Test Execution Guide

## Python service

```bash
cd services/tax-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
```

## Web tests

```bash
cd apps/web
npm install
npm run test
```

## Smoke checks

After starting the stack:

```bash
npm run smoke:health
```

## Live stack verification

```bash
npm run verify:live-stack
```

## Live integration scaffolding

These tests are opt-in and require a running RefundIQ stack plus Supabase credentials for persistence verification.

```bash
RUN_LIVE_INTEGRATION_TESTS=true npm run test:integration:live
```

Coverage starter scope:

- API health/readiness
- queue depth and Redis-backed health reporting
- document processing round-trip
- persistence into `tax_profiles`, `estimate_runs`, and `extracted_fields`
- research ingestion trigger
- export endpoint

Fixture sources:

- `services/tax-engine/tests/fixtures/live_case_payload.json`
- `supabase/test-fixtures.sql`

## Browser E2E starter scaffolding

```bash
RUN_WEB_E2E=true npm run test:e2e:web
```

Starter browser coverage:

- signup/login
- intake
- uploads page reachability
- internal dashboard access
- research history access
- admin sync-now visibility

Important:

- Browser E2E starter tests are intentionally smoke-oriented and do not expose any internal-only tax logic to client surfaces.
- OCR remains stub/mock configurable in test mode, so upload and processing tests validate orchestration and persistence rather than vendor OCR accuracy.

## Manual verification checklist

- client can sign up and sign in
- forgot/reset password flow renders correctly
- client can save intake answers
- client can upload a supported file after consent
- document-processing job is created and updated
- internal user can override extracted data and rerun estimate
- internal user can ask and resolve a research question
- admin can trigger source sync now
- export actions produce CSV/manual/workpaper outputs
