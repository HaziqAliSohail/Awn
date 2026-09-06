-- ============================================================
-- RLS hardening
-- ------------------------------------------------------------
-- The original policies (006) had three gaps we close here:
--   1. profiles/sprints were selectable by anon (unauthenticated)
--      users, leaking talent PII and raw org problem text to the
--      open internet.
--   2. sprint INSERT only checked auth.role() = 'authenticated',
--      so any signed-in user could forge creator_id and take
--      ownership of another org's sprint.
--   3. handshake INSERT did not bind contributor_id to the caller,
--      letting a user claim a sprint "as" someone else.
-- Note: the app's service-role admin client bypasses RLS by design
-- and is only used from trusted server code with explicit authz.
-- ============================================================

-- ---------- profiles ----------
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- ---------- sprints ----------
drop policy if exists "Sprints are publicly viewable" on public.sprints;
create policy "Sprints are viewable by authenticated users"
  on public.sprints for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can create sprints" on public.sprints;
create policy "Users can create sprints they own"
  on public.sprints for insert
  to authenticated
  with check (auth.uid() = creator_id);

-- ---------- handshakes ----------
drop policy if exists "Authenticated users can create handshakes" on public.sprint_handshakes;
create policy "Users can only claim as themselves"
  on public.sprint_handshakes for insert
  to authenticated
  with check (auth.uid() = contributor_id);
