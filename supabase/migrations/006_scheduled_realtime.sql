-- ============================================================
-- 006 — enable realtime for scheduled outages
-- ============================================================
-- The map now reloads its scheduled pins when the scheduled table changes,
-- which needs the table in the realtime publication.
--
-- Safe to re-run: the table is only added when it is not already published.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled'
  ) then
    alter publication supabase_realtime add table public.scheduled;
  end if;
end
$$;
