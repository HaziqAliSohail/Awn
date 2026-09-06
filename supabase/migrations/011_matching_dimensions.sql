-- ============================================================
-- Phase 1 trust & matching dimensions: gender (mahram-aware /
-- sisters-only requests), languages, and locality. These are
-- prerequisites of trust for this audience, not optional filters.
-- ============================================================

create type gender as enum ('male', 'female');

-- Contributor attributes
alter table public.profiles
  add column if not exists gender    gender,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists city      text,
  add column if not exists region    text;

-- Need (sprint) requirements. required_gender null = no preference.
alter table public.sprints
  add column if not exists required_gender  gender,
  add column if not exists languages_needed text[] not null default '{}'::text[],
  add column if not exists city             text;

-- ── Upgraded matcher ───────────────────────────────────────
-- Hard-filters on gender preference and (when specified) language
-- overlap; softly boosts language overlap and same-city locality on
-- top of cosine similarity. Backward compatible: the new params
-- default to no-op, so existing callers keep working.
create or replace function public.match_professionals(
  query_embedding   vector(1536),
  match_threshold   float default 0.45,
  match_count       int default 3,
  p_required_gender gender default null,
  p_needed_languages text[] default '{}'::text[],
  p_city            text default null
)
returns table (
  id uuid,
  full_name text,
  headline text,
  role_type profile_role,
  skills text[],
  linkedin_url text,
  hours_available_per_week smallint,
  bio text,
  similarity float,
  score float
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.headline,
    p.role_type,
    p.skills,
    p.linkedin_url,
    p.hours_available_per_week,
    p.bio,
    (1 - (p.embedding <=> query_embedding))::float as similarity,
    (
      (1 - (p.embedding <=> query_embedding))
      + case
          when p_needed_languages <> '{}'::text[] and p.languages && p_needed_languages
          then 0.05 else 0 end
      + case
          when p_city is not null and p.city is not null and lower(p.city) = lower(p_city)
          then 0.03 else 0 end
    )::float as score
  from public.profiles p
  where
    p.embedding is not null
    and p.role_type in ('professional', 'student')
    and (p_required_gender is null or p.gender = p_required_gender)
    and (p_needed_languages = '{}'::text[] or p.languages && p_needed_languages)
    and (1 - (p.embedding <=> query_embedding)) > match_threshold
  order by score desc
  limit match_count;
end;
$$;
