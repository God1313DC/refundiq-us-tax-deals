alter table public.research_queries
  add column if not exists answer_mode text,
  add column if not exists authority_level integer,
  add column if not exists ranking_explanation text,
  add column if not exists source_debug jsonb not null default '[]'::jsonb,
  add column if not exists related_change_events jsonb not null default '[]'::jsonb,
  add column if not exists follow_up_questions jsonb not null default '[]'::jsonb,
  add column if not exists case_rule_matches jsonb not null default '[]'::jsonb,
  add column if not exists draft_only_warning boolean not null default false;
