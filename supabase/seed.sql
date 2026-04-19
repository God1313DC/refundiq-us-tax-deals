insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'US Tax Deals', 'us-tax-deals')
on conflict (id) do nothing;

insert into public.users (id, organization_id, full_name, email, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Jordan Miles', 'jordan@example.com', 'client'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Casey Rivera', 'casey@ustaxdeals.com', 'preparer'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Taylor Admin', 'admin@ustaxdeals.com', 'admin')
on conflict (id) do nothing;

insert into public.cases (
  id, organization_id, client_user_id, case_number, tax_year, status, filing_status, state_of_residence, confidence_band
)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RIQ-1024', 2025, 'review_required', 'single', 'Texas', 'medium')
on conflict (id) do nothing;

insert into public.documents (
  id, case_id, uploaded_by, file_name, file_path, mime_type, form_type, status, checksum, consent_recorded
)
values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Payroll W-2.pdf', 'cases/RIQ-1024/w2.pdf', 'application/pdf', 'w2', 'processed', 'sha256-demo-1', true),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'State University 1098-T.pdf', 'cases/RIQ-1024/1098t.pdf', 'application/pdf', '1098_t', 'review_needed', 'sha256-demo-2', true)
on conflict (id) do nothing;

insert into public.tax_profiles (id, case_id, normalized_json, assumptions, missing_items, warnings, version)
values (
  '55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  '{"wages":58400,"federal_withholding":6150,"tuition_paid":4000,"state":"Texas"}'::jsonb,
  '["Using 2025 standard deduction","No itemized deductions in MVP"]'::jsonb,
  '["1098-T payment detail","Local tax withholding detail"]'::jsonb,
  '["Education scenario requires reviewer confirmation"]'::jsonb,
  '2025.1-mvp'
)
on conflict (id) do nothing;

insert into public.source_documents (
  id, title, source_url, source_type, authority_type, authority_tier, priority_order, jurisdiction, status, topic_tags, tax_year, form_number, publication_number, last_status
)
values
  ('66666666-6666-6666-6666-666666666666', 'Instructions for Form 1040 and 1040-SR (2025)', 'https://www.irs.gov/instructions/i1040gi', 'forms_instructions', 'irs_form_instructions', 1, 1, 'federal', 'active', '["form-1040","standard-deduction"]'::jsonb, 2025, '1040', null, 'healthy'),
  ('77777777-7777-7777-7777-777777777777', 'Publication 17 (2025), Your Federal Income Tax', 'https://www.irs.gov/publications/p17', 'publication', 'irs_publication', 1, 2, 'federal', 'active', '["withholding","filing-basics"]'::jsonb, 2025, null, '17', 'healthy'),
  ('88888888-8888-8888-8888-888888888888', 'Publication 970 (2025), Tax Benefits for Education', 'https://www.irs.gov/publications/p970', 'publication', 'irs_publication', 1, 2, 'federal', 'active', '["education","1098-t"]'::jsonb, 2025, null, '970', 'healthy'),
  ('99999999-8888-7777-6666-555555555555', 'QuickAlerts library', 'https://www.irs.gov/e-file-providers/quickalerts-library', 'quickalerts', 'irs_quickalerts', 1, 3, 'federal', 'active', '["quickalerts","mef","iris"]'::jsonb, null, null, null, 'healthy'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Modernized e-File (MeF) user guides and publications', 'https://www.irs.gov/e-file-providers/modernized-e-file-mef-user-guides-and-publications', 'mef_guidance', 'irs_software_developer_guidance', 1, 3, 'federal', 'active', '["mef","developer-guidance"]'::jsonb, null, null, null, 'healthy'),
  ('abababab-abab-abab-abab-abababababab', 'E-file information returns with IRIS', 'https://www.irs.gov/filing/e-file-information-returns-with-iris', 'iris_guidance', 'irs_iris_guidance', 1, 3, 'federal', 'active', '["iris","a2a","1099"]'::jsonb, 2025, null, '5718', 'healthy')
on conflict (id) do nothing;

insert into public.source_versions (id, source_document_id, version_label, published_at, content_hash, extracted_summary, content_type, text_content, metadata, tax_year)
values
  ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', '2025', '2026-03-25T00:00:00Z', 'irs-1040-2025', 'Primary instructions for Form 1040 and 1040-SR for tax year 2025.', 'text/html', 'Primary instructions for Form 1040 and 1040-SR for tax year 2025.', '{"scope_tag":"standard-deduction"}'::jsonb, 2025),
  ('aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', '2025', '2026-02-15T00:00:00Z', 'pub17-2025', 'General individual filing guidance, withholding, and standard deduction context.', 'text/html', 'Publication 17 guidance for withholding and filing basics.', '{"scope_tag":"withholding"}'::jsonb, 2025),
  ('cccccccc-1111-2222-3333-dddddddddddd', '88888888-8888-8888-8888-888888888888', '2025', '2026-02-10T00:00:00Z', 'pub970-2025', 'Education credits and tax benefit guidance for 2025.', 'text/html', 'Publication 970 guidance for education credits.', '{"scope_tag":"education"}'::jsonb, 2025)
on conflict (id) do nothing;

insert into public.rule_cards (id, title, summary, scope_tag, authority_level, decision_rule, client_safe_summary, effective_date, tax_year, required_docs, follow_up_questions, impacted_case_types)
values
  ('eeeeeeee-1111-2222-3333-ffffffffffff', '2025 standard deduction by filing status', 'Use 2025 standard deduction amounts for common 1040 estimate scenarios unless itemized deductions are reviewed separately.', 'standard-deduction', 1, 'Apply 2025 standard deduction based on filing status for MVP scope.', 'Your estimate uses the standard deduction unless a preparer confirms a different path.', '2025-07-04', 2025, '["W-2","basic filing status inputs"]'::jsonb, '["Is the filing status confirmed?"]'::jsonb, '["general-1040"]'::jsonb),
  ('11111111-2222-3333-4444-555555555555', 'Education credit review requirement', 'Education-credit estimation requires support documents and student eligibility review.', 'education', 1, 'Only estimate education benefits when tuition support and eligibility inputs are present.', 'Your estimate may change if education documents or eligibility details are updated.', '2026-02-10', 2025, '["1098-T","proof of payment"]'::jsonb, '["Do we have payment support beyond the 1098-T?"]'::jsonb, '["education-credit"]'::jsonb)
on conflict (id) do nothing;

insert into public.source_ingestion_jobs (id, source_document_id, status, run_type, result_summary, source_count, success_count, failed_count, run_started_at, completed_at)
values
  ('20202020-2020-2020-2020-202020202020', '66666666-6666-6666-6666-666666666666', 'completed', 'scheduled', 'Initial seeded IRS source sync.', 6, 6, 0, '2026-04-18T12:00:00Z', '2026-04-18T12:01:00Z')
on conflict (id) do nothing;

insert into public.citations (id, rule_card_id, source_version_id, excerpt, citation_label)
values
  ('12121212-1212-1212-1212-121212121212', 'eeeeeeee-1111-2222-3333-ffffffffffff', '99999999-9999-9999-9999-999999999999', 'Use the current instructions for Form 1040 and 1040-SR for 2025 filing details and schedules.', 'Form 1040 instructions'),
  ('13131313-1313-1313-1313-131313131313', 'eeeeeeee-1111-2222-3333-ffffffffffff', 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', 'Publication 17 explains standard deduction and individual filing rules.', 'Pub 17'),
  ('14141414-1414-1414-1414-141414141414', '11111111-2222-3333-4444-555555555555', 'cccccccc-1111-2222-3333-dddddddddddd', 'Publication 970 describes education benefit eligibility and documentation considerations.', 'Pub 970')
on conflict (id) do nothing;

insert into public.change_events (id, source_document_id, source_version_id, title, summary, severity, effective_date)
values
  ('15151515-1515-1515-1515-151515151515', '66666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999', '2025 1040 instruction refresh', 'Refresh internal rule cards and estimate constants when annual instructions change.', 'info', '2025-07-04')
on conflict (id) do nothing;

insert into public.research_alerts (id, title, severity, summary, effective_date, related_rule_card_id, related_change_event_id)
values
  ('16161616-1616-1616-1616-161616161616', 'Review 2025 standard deduction assumptions each filing season', 'info', 'Keep estimate constants aligned with current IRS instructions and publications.', '2025-07-04', 'eeeeeeee-1111-2222-3333-ffffffffffff', '15151515-1515-1515-1515-151515151515'),
  ('17171717-1717-1717-1717-171717171717', 'Education credit scenarios require documentation review', 'warning', 'Do not finalize education benefit assumptions from intake alone.', '2026-02-10', '11111111-2222-3333-4444-555555555555', null)
on conflict (id) do nothing;
