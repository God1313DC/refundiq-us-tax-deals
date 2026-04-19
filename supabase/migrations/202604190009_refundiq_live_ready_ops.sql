alter table public.document_processing_jobs
  add column if not exists last_error text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists retry_of_job_id uuid references public.document_processing_jobs(id) on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.source_ingestion_jobs
  add column if not exists triggered_by uuid references public.users(id) on delete set null,
  add column if not exists scheduler_name text,
  add column if not exists retry_count integer not null default 0;

alter table public.research_queries
  add column if not exists review_status text not null default 'open',
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decision_summary text,
  add column if not exists reviewer_note text,
  add column if not exists escalation_reason text,
  add column if not exists guidance_label text,
  add column if not exists resolution_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.research_query_reviews (
  id uuid primary key default gen_random_uuid(),
  research_query_id uuid not null references public.research_queries(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  action text not null,
  review_status text not null,
  note text,
  decision_summary text,
  escalation_reason text,
  guidance_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.research_query_reviews enable row level security;

create policy "staff can view research query reviews" on public.research_query_reviews
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage research query reviews" on public.research_query_reviews
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create index if not exists idx_document_processing_jobs_status_updated_at on public.document_processing_jobs(status, updated_at desc);
create index if not exists idx_source_ingestion_jobs_updated_at on public.source_ingestion_jobs(updated_at desc);
create index if not exists idx_research_queries_review_status on public.research_queries(review_status, created_at desc);
create index if not exists idx_research_query_reviews_query_id on public.research_query_reviews(research_query_id, created_at desc);
