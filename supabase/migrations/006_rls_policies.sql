-- Enable Row-Level Security on all application tables
alter table public.profiles enable row level security;
alter table public.sprints enable row level security;
alter table public.sprint_handshakes enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Anyone can view high-level public professional summaries
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can only modify their own profile records
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Authenticated users can insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- SPRINTS POLICIES
-- ============================================================

-- Open sprints are viewable by any authenticated entity
create policy "Sprints are publicly viewable"
  on public.sprints for select
  using (true);

-- Sprints can only be inserted by authenticated organizations
create policy "Authenticated users can create sprints"
  on public.sprints for insert
  with check (auth.role() = 'authenticated');

-- Sprint creators can update their own sprints
create policy "Creators can update their own sprints"
  on public.sprints for update
  using (auth.uid() = creator_id);

-- ============================================================
-- HANDSHAKES POLICIES
-- ============================================================

-- Handshakes are strictly visible to the sprint creator and the contributor
create policy "Handshakes visible to matched participants"
  on public.sprint_handshakes for select
  using (
    auth.uid() = contributor_id or
    auth.uid() in (select creator_id from public.sprints where id = sprint_id)
  );

-- Authenticated users can create handshakes
create policy "Authenticated users can create handshakes"
  on public.sprint_handshakes for insert
  with check (auth.role() = 'authenticated');

-- Only matched participants can update handshakes
create policy "Participants can update their handshakes"
  on public.sprint_handshakes for update
  using (
    auth.uid() = contributor_id or
    auth.uid() in (select creator_id from public.sprints where id = sprint_id)
  );
