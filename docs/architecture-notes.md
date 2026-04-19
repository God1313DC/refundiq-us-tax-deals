# Architecture Notes

## Web Application

- Next.js App Router with role-protected client, internal, and admin surfaces
- Supabase SSR helpers for auth-aware route handling
- Storage-backed upload flow through server-side route handling
- Internal-only research console that calls the FastAPI service
- Research answer history and reviewer-resolution workflow for internal-only guidance handling
- Admin operational actions for sync-now, retry, reprocess, rerun, and role updates

## Tax Engine Service

- FastAPI endpoints for documents, estimates, exports, and research
- Deterministic rules engine with traceable line items
- Queue-friendly document processing structure using RQ and Redis
- Controlled research service returning source-cited internal answers
- Scheduler loop for recurring source-ingestion runs in local/staging environments
- Provider-backed OCR facade with safe stub/mock implementations in this repo

## Database

- Supabase/Postgres schema with RLS
- Separate case, document, extraction, estimate, audit, and research tables
- Review workflow and research-alert support added in V2 migration
- Research query review-history table for preserved evidence and reviewer traceability
