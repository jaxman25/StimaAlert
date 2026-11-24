-- ============================================================
-- 002 — delete policy for scheduled outages
-- ============================================================
-- 001 only granted SELECT and INSERT, so the admin panel's Delete button
-- matched zero rows. V1 keeps the admin panel unlocked; tighten this to
-- authenticated admins when Supabase Auth lands.

create policy "Public delete scheduled"
  on public.scheduled for delete
  to anon, authenticated
  using (true);
