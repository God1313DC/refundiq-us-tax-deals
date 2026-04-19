# Source Ingestion Notes

RefundIQ treats official IRS material as the primary source of truth for internal research, rule monitoring, and citation-backed preparer guidance.

## Current ingestion posture

- `source_documents` stores the canonical source record
- `source_versions` stores versioned snapshots or publication revisions
- `change_events` stores detected or manually recorded change summaries
- `research_alerts` surfaces recent updates to internal users
- `rule_cards` and `citations` connect operational guidance back to source material

## Priority order

1. IRS forms and instructions
2. IRS publications
3. IRS tax professional guidance
4. IRS MeF / software developer guidance
5. IRS IRIS A2A technical guidance
6. IRS QuickAlerts and related updates
7. Internal Revenue Manual where relevant
8. Official state tax authority material where relevant
9. Internal SOPs and approved firm rule cards
10. Secondary commentary only as non-authoritative support

## Current implementation

- Seed data includes representative IRS guidance for Form 1040 instructions, Publication 17, and Publication 970
- Research answers now use the ingested source corpus, stored rule cards, citations, source versions, and change events as the primary internal knowledge base
- The dashboard supports recent alert surfacing and case rule matching
- Queue-backed ingestion jobs can fetch official IRS HTML/PDF source material, hash content, version it, generate change events, and refresh internal rule cards and alerts
- QuickAlerts, MeF, IRIS A2A, TIN Matching, and transcript workflow references are modeled as official-source ingestion targets
- Internal research answers now retrieve ranked supporting passages from ingested source text and citation-linked material, then combine those passages with rule cards and recent changes
- A scheduler service can enqueue recurring source refreshes for local/staging tests
- Admin users can trigger an on-demand sync from the dashboard
- `source_ingestion_jobs` now doubles as operational history for scheduled, manual, and retry runs

## Safe extension path

- Hash fetched documents and compare against prior versions
- Generate structured diffs into `change_events`
- Attach impacted workflow tags and affected case heuristics
- Keep draft IRS forms clearly labeled as draft-only and never final authority
- Replace the lightweight scheduler loop with a production cron/orchestrator
- Expand retrieval quality with richer passage selection and stronger conflict-resolution heuristics across multiple authoritative sources
