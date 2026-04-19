create table if not exists public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  status text not null default 'queued',
  worker_job_id text,
  result_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents
  add column if not exists file_size_bytes bigint,
  add column if not exists duplicate_of uuid references public.documents(id) on delete set null,
  add column if not exists unreadable_reason text,
  add column if not exists preview_path text;

alter table public.extracted_fields
  add column if not exists review_status text not null default 'pending',
  add column if not exists normalization_target text;

alter table public.estimate_runs
  add column if not exists confidence_reasons jsonb not null default '[]'::jsonb,
  add column if not exists client_insights jsonb not null default '[]'::jsonb,
  add column if not exists internal_insights jsonb not null default '[]'::jsonb,
  add column if not exists citations jsonb not null default '[]'::jsonb;

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text not null unique,
  authority_type text not null,
  priority_order integer not null,
  jurisdiction text not null default 'federal',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  version_label text not null,
  published_at timestamptz,
  content_hash text,
  extracted_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.rule_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  scope_tag text not null,
  authority_level integer not null default 1,
  decision_rule text,
  client_safe_summary text,
  updated_at timestamptz not null default now()
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  rule_card_id uuid references public.rule_cards(id) on delete cascade,
  source_version_id uuid not null references public.source_versions(id) on delete cascade,
  excerpt text,
  citation_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.change_events (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  source_version_id uuid references public.source_versions(id) on delete set null,
  title text not null,
  summary text not null,
  severity text not null default 'info',
  effective_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.research_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null default 'info',
  summary text not null,
  effective_date date,
  related_rule_card_id uuid references public.rule_cards(id) on delete set null,
  related_change_event_id uuid references public.change_events(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.document_processing_jobs enable row level security;
alter table public.source_documents enable row level security;
alter table public.source_versions enable row level security;
alter table public.rule_cards enable row level security;
alter table public.citations enable row level security;
alter table public.change_events enable row level security;
alter table public.research_alerts enable row level security;

create policy "users can insert self profile during signup" on public.users
for insert with check (id = auth.uid());

create policy "users can update self profile" on public.users
for update using (id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'));

create policy "clients can insert own cases" on public.cases
for insert with check (client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'));

create policy "client can insert own documents and staff can insert org documents" on public.documents
for insert with check (
  exists (
    select 1 from public.cases c
    where c.id = documents.case_id
      and (c.client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'))
  )
);

create policy "staff can update documents" on public.documents
for update using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage extracted fields" on public.extracted_fields
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage tax profiles" on public.tax_profiles
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage estimate runs" on public.estimate_runs
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage estimate line items" on public.estimate_line_items
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "case owners and staff can create review notes" on public.review_notes
for insert with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can create integration exports" on public.integration_exports
for insert with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access processing jobs" on public.document_processing_jobs
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access research source documents" on public.source_documents
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access source versions" on public.source_versions
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access rule cards" on public.rule_cards
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access citations" on public.citations
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access change events" on public.change_events
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can access research alerts" on public.research_alerts
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create index if not exists idx_document_processing_jobs_case_id on public.document_processing_jobs(case_id);
create index if not exists idx_source_versions_source_document_id on public.source_versions(source_document_id);
create index if not exists idx_citations_rule_card_id on public.citations(rule_card_id);
create index if not exists idx_research_alerts_created_at on public.research_alerts(created_at desc);
