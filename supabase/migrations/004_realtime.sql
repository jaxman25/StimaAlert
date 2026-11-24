-- ============================================================
-- 004 — enable realtime for outages and confirmations
-- ============================================================
-- postgres_changes only broadcasts tables that are part of the
-- supabase_realtime publication. Without this, the map's live pins and the
-- detail sheet's confirmation count never update.
--
-- Safe to re-run: each table is only added when it is not already published.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'outages'
  ) then
    alter publication supabase_realtime add table public.outages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'confirmations'
  ) then
    alter publication supabase_realtime add table public.confirmations;
  end if;
end;
$$;
