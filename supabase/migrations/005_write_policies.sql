-- ============================================================
-- 005 — delete / update policies for outages and confirmations
-- ============================================================
-- 001 only granted SELECT and INSERT, so:
--   * test rows written through the anon key could never be cleaned up
--   * an outage could never be resolved from the app (UPDATE matched 0 rows)
--
-- V1 keeps the admin panel unlocked; tighten these to authenticated admins
-- when Supabase Auth lands.
--
-- Safe to re-run: each policy is dropped before it is recreated.

drop policy if exists "Public delete outages" on public.outages;
create policy "Public delete outages"
  on public.outages for delete
  to anon, authenticated
  using (true);

drop policy if exists "Public update outages" on public.outages;
create policy "Public update outages"
  on public.outages for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public delete confirmations" on public.confirmations;
create policy "Public delete confirmations"
  on public.confirmations for delete
  to anon, authenticated
  using (true);
