-- ============================================================
-- Trust & Safety layer.
--
-- Runs entirely on the community + automation — there is no
-- per-masjid moderator role anywhere in here:
--   * vouches   — members vouch for members (gated to people they
--                 actually connected with, so vouches can't be farmed).
--   * reports   — anyone can flag a member or a need; a single
--                 app-wide admin queue reviews them.
--   * blocks    — a member hides another member from themselves,
--                 mutually, with no drama surfaced to either side.
--   * suspended — an app-wide admin can suspend a bad actor.
--   * screening — new needs carry an AI safety verdict (set by the
--                 backend), surfaced in the admin queue.
--
-- Discovery hiding (blocked-either-way, suspended authors) is
-- enforced in the sprints SELECT policy via SECURITY DEFINER
-- helpers, so it holds for every reader, not just the app UI.
-- ============================================================

-- ── enums ───────────────────────────────────────────────────
do $$ begin
  create type report_reason as enum
    ('spam', 'harassment', 'scam', 'inappropriate', 'safety', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

-- ── moderation flags on existing tables ─────────────────────
alter table public.profiles
  add column if not exists suspended boolean not null default false;

alter table public.sprints
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_reason text;

-- ── vouches ─────────────────────────────────────────────────
create table if not exists public.vouches (
  id          uuid default gen_random_uuid() primary key,
  voucher_id  uuid references public.profiles(id) on delete cascade not null,
  vouchee_id  uuid references public.profiles(id) on delete cascade not null,
  note        text check (note is null or char_length(note) <= 280),
  created_at  timestamptz default clock_timestamp() not null,
  unique (voucher_id, vouchee_id),
  check (voucher_id <> vouchee_id)
);
create index if not exists idx_vouches_vouchee on public.vouches (vouchee_id);

-- ── reports ─────────────────────────────────────────────────
create table if not exists public.reports (
  id                uuid default gen_random_uuid() primary key,
  reporter_id       uuid references public.profiles(id) on delete cascade not null,
  reported_user_id  uuid references public.profiles(id) on delete set null,
  sprint_id         uuid references public.sprints(id) on delete set null,
  reason            report_reason not null,
  detail            text check (detail is null or char_length(detail) <= 1000),
  status            report_status not null default 'open',
  created_at        timestamptz default clock_timestamp() not null,
  -- Must point at something.
  check (reported_user_id is not null or sprint_id is not null)
);
create index if not exists idx_reports_status on public.reports (status, created_at desc);

-- ── blocks ──────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id  uuid references public.profiles(id) on delete cascade not null,
  blocked_id  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default clock_timestamp() not null,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ── SECURITY DEFINER helpers ────────────────────────────────
-- Owned by the migration role, so they read profiles/blocks
-- regardless of the caller's RLS. They expose only a boolean, and
-- never reveal *who* blocked whom.
create or replace function public.is_suspended(uid uuid)
  returns boolean
  language sql stable security definer set search_path = public as $$
    select coalesce((select suspended from public.profiles where id = uid), false)
  $$;

create or replace function public.blocked_between(a uuid, b uuid)
  returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b)
         or (blocker_id = b and blocked_id = a)
    )
  $$;

-- Only authenticated readers hit the sprints SELECT policy that calls these,
-- so anon never needs EXECUTE — withholding it closes a logged-out RPC probe.
revoke all on function public.is_suspended(uuid) from public;
revoke all on function public.blocked_between(uuid, uuid) from public;
grant execute on function public.is_suspended(uuid) to authenticated, service_role;
grant execute on function public.blocked_between(uuid, uuid) to authenticated, service_role;

-- ── discovery hiding: rebuild the sprints SELECT policy ─────
-- Owners always see their own needs; everyone else is denied a
-- need whose author is suspended or block-related to them.
drop policy if exists "Sprints are publicly viewable" on public.sprints;
create policy "Sprints are viewable unless hidden"
  on public.sprints for select
  using (
    auth.uid() = creator_id
    or (
      not public.is_suspended(creator_id)
      and not public.blocked_between(auth.uid(), creator_id)
    )
  );

-- ── RLS: vouches ────────────────────────────────────────────
alter table public.vouches enable row level security;

-- Vouch counts are a public trust signal.
create policy "Vouches are viewable by everyone"
  on public.vouches for select using (true);

create policy "Members vouch as themselves"
  on public.vouches for insert
  to authenticated
  with check (voucher_id = auth.uid());

create policy "Members can retract their own vouch"
  on public.vouches for delete
  to authenticated
  using (voucher_id = auth.uid());

-- ── RLS: reports ────────────────────────────────────────────
alter table public.reports enable row level security;

-- A reporter can see only their own reports; the admin queue reads
-- via the service role (RLS-bypassing) in the backend.
create policy "Reporters can read their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "Members report as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ── RLS: blocks ─────────────────────────────────────────────
alter table public.blocks enable row level security;

-- You can only ever see the blocks you created (never who blocked you).
create policy "Members read their own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Members block as themselves"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Members can unblock"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());
