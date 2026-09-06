-- ============================================================
-- Match and chat safety hardening.
--
--   1. Matching runs with the service role, so the requesting member must be
--      passed into the RPC explicitly for the mutual-block check — a browser
--      RPC call can't omit it (execute is revoked from everyone but the role).
--   2. Vouches become a real ranking signal: an un-farmable trust boost, and
--      the count is returned so the UI can show it.
--   3. Locality stays the dominant lever (same-city boost + a below-threshold
--      pass for same-city helpers), unchanged from the live definition.
--   4. Messages are created only by the API after it has screened and
--      rate-limited them; this removes the browser's direct-write bypass.
-- ============================================================

drop function if exists public.match_professionals(vector, double precision, integer, gender, text[], text, domain_category);

create function public.match_professionals(
  query_embedding    vector,
  match_threshold    float default 0.45,
  match_count        int default 3,
  p_required_gender  gender default null,
  p_needed_languages text[] default '{}'::text[],
  p_city             text default null,
  p_category         domain_category default null,
  p_requester_id     uuid default null
)
returns table (
  id uuid, full_name text, headline text, role_type profile_role,
  skills text[], linkedin_url text, hours_available_per_week smallint,
  bio text, similarity float, score float, has_done boolean, vouch_count int
)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with v as (
    select vouchee_id, count(*)::int as n
    from public.vouches
    group by vouchee_id
  )
  select p.id, p.full_name, p.headline, p.role_type, p.skills, p.linkedin_url,
    p.hours_available_per_week, p.bio,
    (1 - (p.embedding OPERATOR(public.<=>) query_embedding))::float as similarity,
    ((1 - (p.embedding OPERATOR(public.<=>) query_embedding))
      + case when p_category is not null and p.can_help_with @> array[p_category] then 0.10 else 0 end
      + case when p_category is not null and p.have_helped_with @> array[p_category] then 0.15 else 0 end
      + case when p_needed_languages <> '{}'::text[] and p.languages && p_needed_languages then 0.05 else 0 end
      -- locality is the dominant lever: same city is a large boost.
      + case when p_city is not null and p.city is not null and lower(p.city) = lower(p_city) then 0.30 else 0 end
      -- vouches are an un-farmable trust signal (gated to real connections):
      -- a small boost, capped so it tips ties, never buries a good local match.
      + least(coalesce(v.n, 0) * 0.02, 0.10)
    )::float as score,
    (p_category is not null and p.have_helped_with @> array[p_category]) as has_done,
    coalesce(v.n, 0) as vouch_count
  from public.profiles p
  left join v on v.vouchee_id = p.id
  where p.embedding is not null
    -- mutual-block guard; the API always supplies the authenticated member id.
    and (p_requester_id is null or not public.blocked_between(p_requester_id, p.id))
    and (p_required_gender is null or p.gender = p_required_gender)
    and (p_needed_languages = '{}'::text[] or p.languages && p_needed_languages)
    and (
      (1 - (p.embedding OPERATOR(public.<=>) query_embedding)) > match_threshold
      -- let a same-city helper through even a bit below the semantic bar
      or (p_city is not null and p.city is not null and lower(p.city) = lower(p_city)
          and (1 - (p.embedding OPERATOR(public.<=>) query_embedding)) > match_threshold - 0.15)
    )
  order by score desc limit match_count;
end; $$;

-- The API is the only permitted caller: it supplies the authenticated member
-- ID used by the block predicate. This prevents a browser RPC call from
-- omitting that ID and bypassing the filter.
-- Supabase's default privileges auto-grant new public-schema functions to
-- anon/authenticated, so revoking PUBLIC is not enough — revoke those roles
-- explicitly, leaving service_role (the backend) as the only caller.
revoke all on function public.match_professionals(vector, double precision, integer, gender, text[], text, domain_category, uuid) from public;
revoke execute on function public.match_professionals(vector, double precision, integer, gender, text[], text, domain_category, uuid) from anon, authenticated;
grant execute on function public.match_professionals(vector, double precision, integer, gender, text[], text, domain_category, uuid) to service_role;

-- Direct browser writes bypass server-side screening. Retain the RLS-scoped
-- read policy and Realtime delivery, but leave no authenticated INSERT policy —
-- every message must go through POST /messages (screened + rate-limited).
drop policy if exists "Participants can send connection messages" on public.messages;
