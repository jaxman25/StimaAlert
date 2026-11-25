-- ============================================================
-- 008 — count resolution prompts per outage
-- ============================================================
-- The resolve-prompts job may ask "is it back?" at most three times. Without
-- a counter that limit could only be guessed from last_prompt_at, so add one.

alter table public.outages
  add column if not exists prompt_count integer not null default 0;
