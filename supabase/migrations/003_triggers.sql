-- ============================================================
-- 003 — keep vote counters in sync with confirmations
-- ============================================================
-- outages.reports / back_votes were seeded values that never moved.
-- This trigger makes them live counters.
--
-- CONFIRM and STILL_OUT both mean "the outage is still happening", so they
-- count towards reports; BACK means it is over, so it counts towards
-- back_votes.
--
-- security definer is required: clients (anon / authenticated) have no UPDATE
-- policy on outages, so the counter update must run as the function owner.

create or replace function public.bump_outage_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'BACK' then
    update public.outages
      set back_votes = back_votes + 1
      where id = new.outage_id;
  else
    update public.outages
      set reports = reports + 1
      where id = new.outage_id;
  end if;

  return new;
end;
$$;

drop trigger if exists confirmations_bump_votes on public.confirmations;

create trigger confirmations_bump_votes
  after insert on public.confirmations
  for each row
  execute function public.bump_outage_votes();
