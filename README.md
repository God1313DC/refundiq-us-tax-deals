# RefundIQ for US Tax Deals

RefundIQ is a production-style MVP for secure tax intake, document review, and refund estimation for common U.S. individual returns. It is designed as a CPA-assist workflow, not self-file software, and every result is presented as an estimate until a qualified preparer reviews the case.

## What This MVP Covers

- Secure client portal experience for intake, uploads, and estimate viewing
- Internal preparer dashboard for extracted fields, flags, and calculation trace
- FastAPI document-processing and rules engine service
- Supabase-oriented schema with row-level security and audit logging
- Adapter-based export layer for manual tax software workflows
- Premium, trust-building UI for US Tax Deals

## Important Product Boundaries

- This tool is **not** official IRS filing software
- This tool does **not** guarantee 100% accuracy
- This tool does **not** replace final review by a qualified tax professional
- All results are shown as **estimated** until a human reviewer finalizes the case

## MVP Tax Scope

This MVP intentionally supports a limited scope:

- Form 1040 basic individual returns
- Filing statuses: single, married filing jointly, married filing separately, head of household
- W-2 wages
- Simple 1099 income
- Standard deduction
- Basic education-credit style scenario checks when inputs are complete
- Federal estimate first, state estimate modular and limited

Complex scenarios should be routed to manual review.

## Architecture

### Web app

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI components
- Supabase auth/storage/database integration points

### Tax engine service

- FastAPI
- Deterministic rules engine with traceable line items
- OCR/classification/parsing pipeline stubs
- Background worker pattern for document processing
- Adapter-based export layer

### Data layer

- PostgreSQL / Supabase schema
- Row-level security policies
- Audit logs
- Integration export history
- Review note tracking
- IRS source ingestion, versioning, rule-card updates, and change monitoring

## Repository Structure

```text
.
├── .env.example
├── README.md
├── docker-compose.yml
├── docs/
│   ├── disclaimers.md
│   └── security-notes.md
├── supabase/
│   ├── migrations/
│   │   └── 202604190001_refundiq_schema.sql
│   └── seed.sql
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
└── services/
    └── tax-engine/
        ├── app/
        │   ├── adapters/
        │   ├── api/routes/
        │   ├── services/
        │   └── workers/
        ├── Dockerfile
        └── requirements.txt
```

## Product Architecture

1. Client signs in and consents before uploading documents.
2. Files are stored in a private Supabase bucket and queued for processing.
3. The Python service classifies each document, runs OCR when needed, extracts fields, and normalizes them into a canonical tax profile.
4. The estimation engine produces a traceable federal/state estimate with assumptions, warnings, and confidence.
5. A research-ingestion subsystem tracks authoritative IRS source changes, versions source content, and generates internal rule and alert updates.
6. Internal staff review extracted fields, flags, notes, source alerts, and rule changes before marking the case ready for tax software entry.
7. Client sees only a simplified estimate, missing documents, confidence band, disclaimer, and next-step CTA.

## Core Pages

### Client-facing

- `/` marketing and trust-building landing page
- `/login` sign in
- `/signup` create account
- `/forgot-password` request password reset
- `/reset-password` complete password reset
- `/portal` refund estimate dashboard
- `/portal/profile` client profile and status view
- `/portal/intake` guided intake questionnaire
- `/portal/uploads` upload center

### Internal

- `/internal` preparer queue and operational overview
- `/internal/cases/[caseId]` extraction review, calculation trace, notes, and workpaper context
- `/internal/research` cited research workspace and recent IRS updates
- `/internal/research/history` saved research answers and reviewer resolution workflow
- `/admin` security and retention posture overview

## FastAPI Routes

- `GET /health`
- `GET /ready`
- `POST /v1/documents/intake`
- `POST /v1/documents/process`
- `POST /v1/estimates/run`
- `POST /v1/estimates/rerun-from-profile`
- `POST /v1/research/ingestion/run`
- `GET /v1/research/ingestion/jobs/{job_id}`
- `GET /v1/cases/{case_id}`
- `POST /v1/cases/{case_id}/review`
- `POST /v1/exports/{case_id}`

## Database Models

- `organizations`
- `users`
- `cases`
- `documents`
- `document_versions`
- `document_processing_jobs`
- `extracted_fields`
- `intake_questionnaires`
- `tax_profiles`
- `estimate_runs`
- `estimate_line_items`
- `insights`
- `review_notes`
- `audit_logs`
- `integration_exports`
- `case_status_history`
- `source_documents`
- `source_versions`
- `rule_cards`
- `citations`
- `change_events`
- `research_alerts`
- `case_rule_matches`
- `research_queries`
- `research_query_reviews`

## UI Surface

### Client-facing

- Trust-building landing page with product boundaries and CTA
- Secure login and account creation
- Estimate dashboard with confidence, missing items, next steps, and disclaimer
- Guided intake questionnaire
- Upload center with accepted document types and consent framing

### Internal-facing

- Queue dashboard with case triage and confidence signals
- Case review page with document extraction table
- Calculation trace table with line items
- Assumptions, warnings, internal insights, and review notes
- Admin posture page for security and retention orientation

## Running Locally

### Web app

```bash
cd apps/web
npm install
npm run dev
```

### Python service

```bash
cd services/tax-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
docker compose up --build
```

### Local stack scripts

```bash
./scripts/boot-local-stack.sh
npm run smoke:health
npm run verify:live-stack
```

## Security Highlights

- Role-based access model for client, preparer, and admin users
- Row-level security for case and document access
- PII-safe logging posture
- Audit logging for document access, edits, and estimate runs
- Consent checkbox required before upload
- Data retention configuration support

See [docs/security-notes.md](/Users/dev/Documents/New project/docs/security-notes.md) for details.

## Testing

### Web

```bash
cd apps/web
npm install
npm run test
```

### Python service

```bash
cd services/tax-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
```

### Live integration scaffolding

```bash
RUN_LIVE_INTEGRATION_TESTS=true npm run test:integration:live
```

### Browser E2E scaffolding

```bash
RUN_WEB_E2E=true npm run test:e2e:web
```

## V3 Upgrade Notes

This version extends the original scaffold with:

- Supabase-backed auth helpers and route protection
- Secure upload route with storage persistence, checksuming, duplicate hook, consent enforcement, and processing-job creation
- Upload-triggered processing handoff to FastAPI with queued/completed job handling
- FastAPI persistence flow back into Supabase for extracted fields, normalized tax profiles, estimate runs, line items, insights, and rule matches
- Internal review actions for notes, field overrides, reruns, and status changes
- Intake questionnaire persistence and case status history
- Research subsystem V1 with cited IRS-aware rule cards and recent alert support
- Additional schema for processing jobs, research sources, citations, change events, and alerts
- Test coverage for access rules, upload validation, estimate paths, and cited research responses

## Working vs Placeholder

### Working in this repository

- Auth/server helpers and protected-route structure
- Supabase storage upload route and metadata persistence flow
- Upload-triggered processing requests to FastAPI
- FastAPI persistence back into Supabase for processing and estimate results
- Deterministic estimate engine with confidence reasons and citations
- Internal cited research route and UI
- Queue-driven IRS source ingestion with versioning, change-event creation, rule-card updates, and alert generation
- DB-backed research answering that prioritizes ingested IRS/source corpus, rule cards, citations, source versions, and change events
- Passage-ranked research retrieval with recency handling, draft-vs-final warnings, and conflict surfacing for internal answers
- Review-note, override, rerun, and case-status actions
- Admin metrics cards plus operational actions for sync-now, retry, reprocess, rerun, and role changes
- Research answer history with reviewer resolution tracking
- Password reset UI and role-aware auth redirects
- CSV/manual-summary export improvements plus integration-export logging
- Dockerized local stack with web, API, worker, scheduler, and Redis services
- Web/API health endpoints plus live verification scripts and integration-test scaffolding

### Still intentionally placeholder / extension path

- Production OCR provider integration
- Fully rendered PDF workpaper generation
- Live Drake integration
- State-specific tax modules beyond a conservative starter path
- Production cron/orchestration hardening beyond the lightweight scheduler loop
- Research answer synthesis is deterministic and source-backed, but still heuristic rather than a full legal-reasoning engine
- Passage retrieval and conflict analysis are stronger, but still rely on heuristic ranking and should not replace qualified tax review
- Supabase auth email delivery and real credentials are still required for full password-reset testing
- Browser E2E flows need real seeded credentials and installed Playwright dependencies

See [docs/architecture-notes.md](/Users/dev/Documents/New project/docs/architecture-notes.md), [docs/source-ingestion-notes.md](/Users/dev/Documents/New project/docs/source-ingestion-notes.md), [docs/irs-source-policy.md](/Users/dev/Documents/New project/docs/irs-source-policy.md), [docs/drake-adapter-notes.md](/Users/dev/Documents/New project/docs/drake-adapter-notes.md), [docs/known-limitations.md](/Users/dev/Documents/New project/docs/known-limitations.md), [docs/todo-production-hardening.md](/Users/dev/Documents/New project/docs/todo-production-hardening.md), [docs/local-dev-runbook.md](/Users/dev/Documents/New project/docs/local-dev-runbook.md), [docs/staging-deployment-notes.md](/Users/dev/Documents/New project/docs/staging-deployment-notes.md), [docs/test-execution-guide.md](/Users/dev/Documents/New project/docs/test-execution-guide.md), [docs/environment-reference.md](/Users/dev/Documents/New project/docs/environment-reference.md), and [docs/troubleshooting.md](/Users/dev/Documents/New project/docs/troubleshooting.md) for the next layer.

## Disclaimer

> This tool provides an estimate for review purposes only and is not a substitute for a final tax return prepared and reviewed by a qualified tax professional.

More disclaimer variants live in [docs/disclaimers.md](/Users/dev/Documents/New project/docs/disclaimers.md).

## Notes On Tax Logic

The estimator is intentionally modular and limited-scope. It includes deterministic, traceable calculations for common 1040 scenarios and marks TODO areas clearly where reviewed tax-law expansion is needed. Estimates should be reviewed before use in production.

Where official tax-year values are included, they should be revalidated each filing season before release.
