create table if not exists public.intake_questionnaires (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  filing_status text,
  dependents_count integer not null default 0,
  qualifying_child_count integer not null default 0,
  education_expenses numeric(12,2) not null default 0,
  self_employment boolean not null default false,
  rental_income boolean not null default false,
  state_of_residence text,
  local_tax_jurisdiction text,
  withholding_notes text,
  has_1098_t boolean not null default false,
  consent_accepted boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.case_rule_matches (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  rule_card_id uuid not null references public.rule_cards(id) on delete cascade,
  severity text not null default 'info',
  explanation text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.research_queries (
  id uuid primary key default gen_random_uuid(),
  asked_by uuid not null references public.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  question text not null,
  answer text,
  citations jsonb not null default '[]'::jsonb,
  conflict_detected boolean not null default false,
  human_review_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.source_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.source_documents(id) on delete set null,
  status text not null default 'queued',
  run_type text not null default 'refresh',
  result_summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.client_insights as
select *
from public.insights
where audience = 'client';

create or replace view public.internal_insights as
select *
from public.insights
where audience = 'internal';

alter table public.intake_questionnaires enable row level security;
alter table public.case_status_history enable row level security;
alter table public.case_rule_matches enable row level security;
alter table public.research_queries enable row level security;
alter table public.source_ingestion_jobs enable row level security;

create policy "case owners and staff can view intake questionnaires" on public.intake_questionnaires
for select using (
  exists (
    select 1 from public.cases c
    where c.id = intake_questionnaires.case_id
      and (c.client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'))
  )
);

create policy "case owners and staff can upsert intake questionnaires" on public.intake_questionnaires
for all using (
  exists (
    select 1 from public.cases c
    where c.id = intake_questionnaires.case_id
      and (c.client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'))
  )
)
with check (
  exists (
    select 1 from public.cases c
    where c.id = intake_questionnaires.case_id
      and (c.client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'))
  )
);

create policy "staff can view case status history" on public.case_status_history
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can insert case status history" on public.case_status_history
for insert with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can view case rule matches" on public.case_rule_matches
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can manage case rule matches" on public.case_rule_matches
for all using (public.current_app_user_role() in ('preparer', 'admin'))
with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can view research queries" on public.research_queries
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff can insert research queries" on public.research_queries
for insert with check (public.current_app_user_role() in ('preparer', 'admin'));

create policy "admin can view source ingestion jobs" on public.source_ingestion_jobs
for select using (public.current_app_user_role() = 'admin');

create policy "admin can manage source ingestion jobs" on public.source_ingestion_jobs
for all using (public.current_app_user_role() = 'admin')
with check (public.current_app_user_role() = 'admin');

create index if not exists idx_intake_questionnaires_case_id on public.intake_questionnaires(case_id);
create index if not exists idx_case_status_history_case_id on public.case_status_history(case_id);
create index if not exists idx_case_rule_matches_case_id on public.case_rule_matches(case_id);
create index if not exists idx_research_queries_case_id on public.research_queries(case_id);
create index if not exists idx_source_ingestion_jobs_status on public.source_ingestion_jobs(status);
