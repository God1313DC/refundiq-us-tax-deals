alter table public.research_queries
  add column if not exists supporting_passages jsonb not null default '[]'::jsonb,
  add column if not exists conflict_summary text,
  add column if not exists conflict_reasons jsonb not null default '[]'::jsonb;
