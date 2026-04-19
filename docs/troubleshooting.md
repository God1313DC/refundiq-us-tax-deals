# Troubleshooting

## Upload says processing failed

- confirm `FASTAPI_BASE_URL` is reachable from the web service
- confirm Redis is running
- confirm the worker service is running
- inspect `document_processing_jobs.last_error`
- run `npm run verify:live-stack`
- if `/health` shows queue counts but jobs never complete, the worker is likely not consuming Redis jobs

## Research sync does not run

- confirm `SCHEDULER_ENABLED=true` if using the scheduler service
- use the admin "Run source sync now" action to test on demand
- inspect `source_ingestion_jobs.error_message`
- confirm the `scheduler` container is running in Docker
- if admin sync works but scheduled sync does not, review `SCHEDULER_SOURCE_INTERVAL_MINUTES` and `SCHEDULER_RUN_ON_STARTUP`

## Preparer sees no live case data

- confirm Supabase migrations and seed data were applied
- confirm the logged-in user has `preparer` or `admin` role in `public.users`
- inspect row-level-security and service-role configuration
- load `supabase/test-fixtures.sql` for predictable test users and a starter case

## Password reset link does not work

- confirm `NEXT_PUBLIC_SITE_URL` matches the allowed auth redirect URL in Supabase
- confirm email sending is enabled in the Supabase auth project

## Live integration tests are skipped

- set `RUN_LIVE_INTEGRATION_TESTS=true`
- set `LIVE_SUPABASE_URL` and `LIVE_SUPABASE_SERVICE_ROLE_KEY`
- ensure the web, API, worker, scheduler, and Redis services are running

## Browser E2E tests are skipped

- set `RUN_WEB_E2E=true`
- provide the seeded or real login credentials in the `E2E_*` env vars
- install Playwright browsers after dependency install if needed

## Exports look placeholder-heavy

- that is expected for Drake and PDF rendering in this repo
- CSV/manual summary exports are real workflow artifacts
- Drake adapters remain explicit extension points unless firm-authorized integration details are available
