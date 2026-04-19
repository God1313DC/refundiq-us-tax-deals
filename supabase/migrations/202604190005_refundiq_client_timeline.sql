create policy "case owners can view case status history" on public.case_status_history
for select using (
  exists (
    select 1 from public.cases c
    where c.id = case_status_history.case_id
      and c.client_user_id = auth.uid()
  )
);
