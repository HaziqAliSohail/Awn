-- ============================================================
-- Notifications.
--
-- Three delivery surfaces off one source of truth (the
-- notifications table): an in-app center (realtime, like chat),
-- email (sent from the backend over the project's Gmail SMTP),
-- and web push (VAPID, per-device subscriptions).
--
-- Rows are written ONLY by the backend (service role) as it
-- processes the connection lifecycle — offers, invites, accepts,
-- completions — so there is no user INSERT policy. Recipients can
-- read and mark their own read.
-- ============================================================

do $$ begin
  create type notification_type as enum ('offer', 'invite', 'accepted', 'completed');
exception when duplicate_object then null; end $$;

-- Per-member channel preferences (default on; a toggle can come later).
alter table public.profiles
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_push  boolean not null default true;

-- ── notifications ───────────────────────────────────────────
create table if not exists public.notifications (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,  -- recipient
  type          notification_type not null,
  title         text not null,
  body          text,
  handshake_id  uuid references public.sprint_handshakes(id) on delete cascade,
  sprint_id     uuid references public.sprints(id) on delete cascade,
  actor_id      uuid references public.profiles(id) on delete set null,          -- who caused it
  read_at       timestamptz,
  created_at    timestamptz default clock_timestamp() not null
);
create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Members read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Recipients may only mark their own as read (they can't forge fields — the
-- WITH CHECK keeps the row theirs).
create policy "Members update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Live badge + list, same mechanism as chat.
alter publication supabase_realtime add table public.notifications;

-- ── push subscriptions ──────────────────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default clock_timestamp() not null
);
create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A member manages their own device subscriptions; the backend reads them via
-- the service role to send.
create policy "Members read their own push subs"
  on public.push_subscriptions for select
  to authenticated using (user_id = auth.uid());
create policy "Members add their own push subs"
  on public.push_subscriptions for insert
  to authenticated with check (user_id = auth.uid());
create policy "Members remove their own push subs"
  on public.push_subscriptions for delete
  to authenticated using (user_id = auth.uid());
