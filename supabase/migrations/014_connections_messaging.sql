-- ============================================================
-- In-app messaging. A conversation is anchored to a connection
-- (sprint_handshakes row) and opens ONLY after mutual consent
-- (status 'accepted' or 'completed') — an anti-spam and gender/
-- safeguarding gate. Realtime-enabled for live chat.
--
-- `intro_note` lets whoever initiates the connection (a helper's
-- offer or a requester's invite) attach a first message the other
-- party sees while deciding — before the chat opens.
-- ============================================================

alter table public.sprint_handshakes
  add column if not exists intro_note text
    check (intro_note is null or char_length(intro_note) <= 1000);

create table if not exists public.messages (
  id           uuid default gen_random_uuid() primary key,
  handshake_id uuid references public.sprint_handshakes(id) on delete cascade not null,
  sender_id    uuid references public.profiles(id) on delete cascade not null,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz default clock_timestamp() not null
);

create index if not exists idx_messages_handshake
  on public.messages (handshake_id, created_at);

alter table public.messages enable row level security;

-- Participants of an *accepted* connection can read its messages.
create policy "Participants can read connection messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.sprint_handshakes h
      join public.sprints s on s.id = h.sprint_id
      where h.id = messages.handshake_id
        and h.status in ('accepted', 'completed')
        and (auth.uid() = h.contributor_id or auth.uid() = s.creator_id)
    )
  );

-- Participants can send as themselves, only while the connection is open.
create policy "Participants can send connection messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.sprint_handshakes h
      join public.sprints s on s.id = h.sprint_id
      where h.id = messages.handshake_id
        and h.status in ('accepted', 'completed')
        and (auth.uid() = h.contributor_id or auth.uid() = s.creator_id)
    )
  );

-- Live chat via Supabase Realtime (the frontend subscribes with the anon
-- key under RLS; no websocket server to run ourselves).
alter publication supabase_realtime add table public.messages;
