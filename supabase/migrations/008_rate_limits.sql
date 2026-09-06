-- ============================================================
-- Durable, race-safe rate limiting / quota primitive
-- ------------------------------------------------------------
-- Serverless functions cannot share in-memory counters across
-- instances, so cost- and abuse-protection must live in the DB.
-- This table + atomic RPC gives us a fixed-window counter that
-- is safe under concurrency (single-statement upsert).
-- Only the service role touches this table (RLS on, no policies).
-- ============================================================

create table if not exists public.rate_limits (
  key           text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Intentionally NO policies: reachable only via the service-role
-- admin client through consume_rate_limit() below.

-- Returns TRUE when the caller is under the limit (and records the
-- hit), FALSE when the limit for the current window is exceeded.
create or replace function public.consume_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set
      count = case
        when public.rate_limits.window_start
             < v_now - make_interval(secs => p_window_seconds)
        then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start
             < v_now - make_interval(secs => p_window_seconds)
        then v_now
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Housekeeping helper (optional to schedule): purge stale windows.
create or replace function public.prune_rate_limits(p_older_than_seconds integer default 86400)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => p_older_than_seconds);
$$;
