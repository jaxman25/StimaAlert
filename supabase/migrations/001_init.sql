-- ============================================================
-- StimaAlert — initial schema
-- ============================================================
-- Rewritten from the pseudocode in docs/SPEC.md as runnable Postgres.
-- Target: Supabase (Postgres 15+ with PostGIS and pgcrypto available).
--
-- Notes:
--   * The Admin panel is unlocked in V1: the policies below let anyone read
--     and insert. Secure admin writes / tighten these before public launch.
-- ============================================================

-- ---------- Extensions ----------

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------- Enums ----------

create type public.outage_type as enum ('POWER', 'INTERNET');

create type public.outage_provider as enum ('KPLC', 'SAFARICOM', 'ZUKU', 'FAIBA', 'AIRTEL', 'TELKOM');

create type public.outage_status as enum ('PENDING', 'ACTIVE', 'RESOLVED');

create type public.confirmation_kind as enum ('CONFIRM', 'STILL_OUT', 'BACK');

-- ---------- Tables ----------

create table public.users (
  id               uuid primary key default gen_random_uuid(),
  telegram_id      text unique,
  followed_estates text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create table public.outages (
  id              uuid primary key default gen_random_uuid(),
  type            public.outage_type not null,
  provider        public.outage_provider,
  estate          text not null,
  location        geography(point, 4326),
  status          public.outage_status not null default 'PENDING',
  reported_by     uuid references public.users (id) on delete set null,
  reports         integer not null default 0,
  still_out_votes integer not null default 0,
  back_votes      integer not null default 0,
  reported_at     timestamptz not null default now(),
  last_prompt_at  timestamptz,
  resolved_at     timestamptz
);

create table public.scheduled (
  id         uuid primary key default gen_random_uuid(),
  provider   public.outage_provider not null,
  estate     text not null,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  source_url text,
  added_by   text not null default 'manual:admin'
);

create table public.confirmations (
  id         uuid primary key default gen_random_uuid(),
  outage_id  uuid not null references public.outages (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  kind       public.confirmation_kind not null,
  created_at timestamptz not null default now(),
  unique (outage_id, user_id, kind)
);

-- ---------- Indexes ----------

create index outages_status_idx on public.outages (status);
create index outages_estate_idx on public.outages (estate);
create index outages_reported_at_idx on public.outages (reported_at desc);
create index scheduled_start_time_idx on public.scheduled (start_time);
create index confirmations_outage_id_idx on public.confirmations (outage_id);

-- ---------- Row Level Security ----------
--
-- V1: the Admin panel is unlocked and there is no auth gate, so these policies
-- intentionally allow anyone to read and insert. Replace the insert policies
-- with authenticated/admin-scoped checks before launch.

alter table public.users enable row level security;
alter table public.outages enable row level security;
alter table public.scheduled enable row level security;
alter table public.confirmations enable row level security;

create policy "Public read users"
  on public.users for select
  to anon, authenticated
  using (true);

create policy "Public insert users"
  on public.users for insert
  to anon, authenticated
  with check (true);

create policy "Public read outages"
  on public.outages for select
  to anon, authenticated
  using (true);

create policy "Public insert outages"
  on public.outages for insert
  to anon, authenticated
  with check (true);

create policy "Public read scheduled"
  on public.scheduled for select
  to anon, authenticated
  using (true);

create policy "Public insert scheduled"
  on public.scheduled for insert
  to anon, authenticated
  with check (true);

create policy "Public read confirmations"
  on public.confirmations for select
  to anon, authenticated
  using (true);

create policy "Public insert confirmations"
  on public.confirmations for insert
  to anon, authenticated
  with check (true);

-- ---------- Demo seed data ----------
--
-- Fixed UUIDs keep re-running this file from duplicating rows.

insert into public.users (id, telegram_id, followed_estates)
values (
  '00000000-0000-0000-0000-000000000001',
  '100000001',
  array['Rongai', 'Kinoo']
)
on conflict (id) do nothing;

insert into public.outages
  (id, type, provider, estate, location, status, reported_by, reports, still_out_votes, back_votes, reported_at)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'POWER',
    'KPLC',
    'Rongai',
    st_setsrid(st_makepoint(36.7500, -1.3960), 4326)::geography,
    'ACTIVE',
    '00000000-0000-0000-0000-000000000001',
    4,
    3,
    0,
    now() - interval '35 minutes'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'POWER',
    'KPLC',
    'Rongai',
    st_setsrid(st_makepoint(36.7560, -1.3915), 4326)::geography,
    'ACTIVE',
    '00000000-0000-0000-0000-000000000001',
    2,
    2,
    0,
    now() - interval '2 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'INTERNET',
    'SAFARICOM',
    'Kinoo',
    st_setsrid(st_makepoint(36.6620, -1.2510), 4326)::geography,
    'PENDING',
    '00000000-0000-0000-0000-000000000001',
    1,
    1,
    0,
    now() - interval '12 minutes'
  )
on conflict (id) do nothing;

insert into public.scheduled
  (id, provider, estate, start_time, end_time, source_url, added_by)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'KPLC',
    'Kinoo',
    now() + interval '2 days',
    now() + interval '2 days 6 hours',
    'https://kpcl.co.ke/scheduled-maintenance/kinoo',
    'manual:admin'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'SAFARICOM',
    'Rongai',
    now() + interval '4 days',
    now() + interval '4 days 3 hours',
    'https://safaricom.co.ke/network-maintenance/rongai',
    'manual:admin'
  )
on conflict (id) do nothing;
