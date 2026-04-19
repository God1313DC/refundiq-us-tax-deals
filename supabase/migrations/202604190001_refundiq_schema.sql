create extension if not exists "pgcrypto";

create type public.app_role as enum ('client', 'preparer', 'admin');
create type public.case_status as enum ('intake_in_progress', 'processing', 'review_required', 'reviewed', 'ready_for_tax_software_entry');
create type public.document_status as enum ('uploaded', 'processing', 'processed', 'review_needed', 'unreadable', 'duplicate');
create type public.insight_audience as enum ('client', 'internal');

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  email text not null,
  role public.app_role not null default 'client',
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_user_id uuid not null references public.users(id) on delete cascade,
  case_number text not null unique,
  tax_year integer not null,
  status public.case_status not null default 'intake_in_progress',
  filing_status text,
  state_of_residence text,
  confidence_band text,
  preparer_reviewed_at timestamptz,
  ready_for_tax_software_entry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  uploaded_by uuid references public.users(id),
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  form_type text,
  status public.document_status not null default 'uploaded',
  checksum text,
  encrypted_at_rest boolean not null default true,
  consent_recorded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  checksum text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  field_name text not null,
  field_value jsonb not null,
  source_label text,
  extraction_confidence numeric(5,4),
  manually_overridden boolean not null default false,
  overridden_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tax_profiles (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  normalized_json jsonb not null,
  assumptions jsonb not null default '[]'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  version text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  engine_version text not null,
  estimated_federal_refund_or_due numeric(12,2) not null,
  estimated_state_refund_or_due numeric(12,2) not null default 0,
  confidence_band text not null,
  assumptions jsonb not null default '[]'::jsonb,
  missing_data_warnings jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true,
  generated_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_run_id uuid not null references public.estimate_runs(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null,
  category text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  estimate_run_id uuid references public.estimate_runs(id) on delete set null,
  audience public.insight_audience not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  note text not null,
  internal_only boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_exports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  export_type text not null,
  status text not null,
  exported_by uuid references public.users(id),
  output_path text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.extracted_fields enable row level security;
alter table public.tax_profiles enable row level security;
alter table public.estimate_runs enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.insights enable row level security;
alter table public.review_notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_exports enable row level security;

create or replace function public.current_app_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create policy "users can view themselves" on public.users
for select using (id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'));

create policy "clients can view own cases and staff can view org cases" on public.cases
for select using (
  client_user_id = auth.uid()
  or public.current_app_user_role() in ('preparer', 'admin')
);

create policy "staff can update cases" on public.cases
for update using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "case document access" on public.documents
for select using (
  exists (
    select 1 from public.cases c
    where c.id = documents.case_id
      and (c.client_user_id = auth.uid() or public.current_app_user_role() in ('preparer', 'admin'))
  )
);

create policy "staff extracted field access" on public.extracted_fields
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "staff tax profile access" on public.tax_profiles
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "estimate run access" on public.estimate_runs
for select using (
  public.current_app_user_role() in ('preparer', 'admin')
  or exists (select 1 from public.cases c where c.id = estimate_runs.case_id and c.client_user_id = auth.uid())
);

create policy "insight access by audience" on public.insights
for select using (
  audience = 'internal' and public.current_app_user_role() in ('preparer', 'admin')
  or audience = 'client' and exists (select 1 from public.cases c where c.id = insights.case_id and c.client_user_id = auth.uid())
);

create policy "review notes staff only" on public.review_notes
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create policy "audit logs admin only" on public.audit_logs
for select using (public.current_app_user_role() = 'admin');

create policy "integration exports staff only" on public.integration_exports
for select using (public.current_app_user_role() in ('preparer', 'admin'));

create index if not exists idx_cases_client_user_id on public.cases(client_user_id);
create index if not exists idx_documents_case_id on public.documents(case_id);
create index if not exists idx_extracted_fields_case_id on public.extracted_fields(case_id);
create index if not exists idx_estimate_runs_case_id on public.estimate_runs(case_id);
create index if not exists idx_audit_logs_case_id on public.audit_logs(case_id);
