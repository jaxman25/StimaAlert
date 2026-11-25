-- ============================================================
-- 007 — require an authenticated session for admin writes
-- ============================================================
-- The admin panel is now gated behind Supabase Auth, but RLS still let the
-- anon key insert and delete scheduled outages, and delete or update any
-- outage. Those are admin actions, so they now need a session.
--
-- Public reporting stays open on purpose: anyone can still insert an outage
-- and cast a confirmation, which is the whole point of a crowdsourced map.
--
-- Apply after 001, 002 and 005. Safe to re-run: every policy is dropped first,
-- including the anon ones that 001/002/005 create.

-- ---------- scheduled: admin only ----------

drop policy if exists "Public insert scheduled" on public.scheduled;
drop policy if exists "Public delete scheduled" on public.scheduled;
drop policy if exists "Authenticated insert scheduled" on public.scheduled;
drop policy if exists "Authenticated update scheduled" on public.scheduled;
drop policy if exists "Authenticated delete scheduled" on public.scheduled;

create policy "Authenticated insert scheduled"
  on public.scheduled for insert
  to authenticated
  with check (true);

create policy "Authenticated update scheduled"
  on public.scheduled for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated delete scheduled"
  on public.scheduled for delete
  to authenticated
  using (true);

-- ---------- outages: resolve / delete are admin only ----------

drop policy if exists "Public update outages" on public.outages;
drop policy if exists "Public delete outages" on public.outages;
drop policy if exists "Authenticated update outages" on public.outages;
drop policy if exists "Authenticated delete outages" on public.outages;

create policy "Authenticated update outages"
  on public.outages for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated delete outages"
  on public.outages for delete
  to authenticated
  using (true);

-- ---------- confirmations: cleanup is admin only ----------

drop policy if exists "Public delete confirmations" on public.confirmations;
drop policy if exists "Authenticated delete confirmations" on public.confirmations;

create policy "Authenticated delete confirmations"
  on public.confirmations for delete
  to authenticated
  using (true);

-- ---------- left open on purpose ----------
--
--   "Public read *"              every table — the map is public
--   "Public insert outages"      anyone can report an outage (defaults PENDING)
--   "Public insert confirmations" anyone can confirm / mark still out / it's back
--   "Public insert users"        the demo user the web app reports as
