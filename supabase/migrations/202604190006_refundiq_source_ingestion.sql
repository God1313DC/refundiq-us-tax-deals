alter table public.source_documents
  add column if not exists source_type text,
  add column if not exists authority_tier integer not null default 1,
  add column if not exists revision_date text,
  add column if not exists tax_year integer,
  add column if not exists form_number text,
  add column if not exists publication_number text,
  add column if not exists topic_tags jsonb not null default '[]'::jsonb,
  add column if not exists checksum text,
  add column if not exists draft_only boolean not null default false,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_status text not null default 'pending',
  add column if not exists last_error text;

alter table public.source_versions
  add column if not exists content_type text,
  add column if not exists raw_content text,
  add column if not exists text_content text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists diff_summary text,
  add column if not exists tax_year integer,
  add column if not exists revision_date text;

alter table public.rule_cards
  add column if not exists source_document_id uuid references public.source_documents(id) on delete set null,
  add column if not exists effective_date text,
  add column if not exists tax_year integer,
  add column if not exists thresholds jsonb not null default '{}'::jsonb,
  add column if not exists required_docs jsonb not null default '[]'::jsonb,
  add column if not exists exceptions jsonb not null default '[]'::jsonb,
  add column if not exists follow_up_questions jsonb not null default '[]'::jsonb,
  add column if not exists internal_review_notes text,
  add column if not exists impacted_case_types jsonb not null default '[]'::jsonb;

alter table public.change_events
  add column if not exists previous_source_version_id uuid references public.source_versions(id) on delete set null,
  add column if not exists impacted_topics jsonb not null default '[]'::jsonb,
  add column if not exists impacted_case_types jsonb not null default '[]'::jsonb,
  add column if not exists diff_summary text;

alter table public.research_alerts
  add column if not exists source_document_id uuid references public.source_documents(id) on delete set null,
  add column if not exists impacted_case_types jsonb not null default '[]'::jsonb,
  add column if not exists authority_level integer not null default 1;

alter table public.source_ingestion_jobs
  add column if not exists run_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists error_message text,
  add column if not exists source_count integer not null default 0,
  add column if not exists success_count integer not null default 0,
  add column if not exists failed_count integer not null default 0;

create unique index if not exists idx_rule_cards_scope_tag_unique on public.rule_cards(scope_tag);
create index if not exists idx_source_documents_source_type on public.source_documents(source_type);
create index if not exists idx_source_documents_last_status on public.source_documents(last_status);
create index if not exists idx_change_events_source_document_id on public.change_events(source_document_id);
create index if not exists idx_source_versions_content_hash on public.source_versions(content_hash);
