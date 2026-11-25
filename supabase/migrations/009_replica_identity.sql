-- ============================================================
-- 009 — full old rows in realtime UPDATE payloads
-- ============================================================
-- The bot announces an outage when it goes PENDING -> ACTIVE, and decides that
-- from payload.old.status. By default Realtime only sends the primary key in
-- `old`, so the transition would be invisible. REPLICA IDENTITY FULL makes
-- Postgres ship the previous row.

alter table public.outages replica identity full;
