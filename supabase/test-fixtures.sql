insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'US Tax Deals', 'us-tax-deals')
on conflict (id) do nothing;

insert into public.users (id, organization_id, full_name, email, role)
values
  ('aaaaaaaa-1111-2222-3333-444444444444', '11111111-1111-1111-1111-111111111111', 'Integration Client', 'integration-client@ustaxdeals.test', 'client'),
  ('bbbbbbbb-1111-2222-3333-444444444444', '11111111-1111-1111-1111-111111111111', 'Integration Preparer', 'integration-preparer@ustaxdeals.test', 'preparer'),
  ('cccccccc-1111-2222-3333-444444444444', '11111111-1111-1111-1111-111111111111', 'Integration Admin', 'integration-admin@ustaxdeals.test', 'admin')
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;

insert into public.cases (id, organization_id, client_user_id, case_number, tax_year, status, confidence_band, filing_status, state_of_residence)
values
  ('dddddddd-1111-2222-3333-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-2222-3333-444444444444', 'RIQ-INTEG-1001', 2025, 'intake_in_progress', 'low', 'single', 'Texas')
on conflict (id) do nothing;

insert into public.intake_questionnaires (case_id, filing_status, dependents_count, qualifying_child_count, education_expenses, self_employment, rental_income, state_of_residence, withholding_notes, has_1098_t, consent_accepted)
values
  ('dddddddd-1111-2222-3333-444444444444', 'single', 0, 0, 1200, false, false, 'Texas', 'Seeded test fixture questionnaire.', true, true)
on conflict (case_id) do update set
  filing_status = excluded.filing_status,
  education_expenses = excluded.education_expenses,
  state_of_residence = excluded.state_of_residence,
  withholding_notes = excluded.withholding_notes,
  has_1098_t = excluded.has_1098_t,
  consent_accepted = excluded.consent_accepted;
