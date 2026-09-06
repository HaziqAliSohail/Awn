-- Sprint handshakes: claim/acceptance state machine
create table public.sprint_handshakes (
  id uuid default gen_random_uuid() primary key,
  sprint_id uuid references public.sprints(id) on delete cascade not null,
  contributor_id uuid references public.profiles(id) on delete cascade not null,
  waiver_acknowledged boolean default false not null check (waiver_acknowledged = true),
  status handshake_status default 'matched' not null,
  proof_of_work_url text,
  created_at timestamptz default clock_timestamp() not null,
  updated_at timestamptz default clock_timestamp() not null,
  unique (sprint_id, contributor_id)
);
