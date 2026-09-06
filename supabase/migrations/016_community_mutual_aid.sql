-- ============================================================
-- Revamp → community mutual aid ("Muslims helping each other").
-- Broadens categories to in-person + advisory help, adds request
-- timing / in-person, and profile experience fields, and makes the
-- matcher experience-aware. DB is empty, so the enum is recreated
-- cleanly. $0 stays (volunteer; materials at cost, no platform money).
-- ============================================================

-- ── Category taxonomy (recreate cleanly) ──────────────────
alter table public.sprints drop column domain;
drop type domain_category;
create type domain_category as enum (
  'janaza', 'meals_food', 'transport_errands', 'home_repairs', 'moving_labor',
  'elder_sick_care', 'childcare_family', 'masjid_events', 'quran_islamic',
  'tutoring_education', 'career_resume', 'legal_immigration', 'health_guidance',
  'tech_digital', 'other'
);
alter table public.sprints add column domain domain_category not null default 'other';

-- ── Request shape: timing + in-person; loosen the hours cap ─
create type help_timing as enum ('urgent', 'this_week', 'flexible', 'scheduled');
alter table public.sprints drop constraint if exists sprints_estimated_hours_check;
alter table public.sprints alter column estimated_hours drop not null;
alter table public.sprints
  add column timing    help_timing not null default 'flexible',
  add column needed_by date,
  add column in_person  boolean not null default false;

-- ── Profile: experience-driven help ───────────────────────
alter table public.profiles
  add column can_help_with     domain_category[] not null default '{}',
  add column have_helped_with  domain_category[] not null default '{}',
  add column volunteer_experience text;

-- ── Experience-aware matcher ──────────────────────────────
-- Everyone with an embedding is matchable (not just "talent"). Boosts:
-- can-help category, DONE-before category (strongest — "people who did this"),
-- language overlap, same city. Gender preference is a hard filter.
drop function if exists public.match_professionals(vector, double precision, integer, gender, text[], text);

create or replace function public.match_professionals(
  query_embedding    vector,
  match_threshold    float default 0.45,
  match_count        int default 3,
  p_required_gender  gender default null,
  p_needed_languages text[] default '{}'::text[],
  p_city             text default null,
  p_category         domain_category default null
)
returns table (
  id uuid, full_name text, headline text, role_type profile_role,
  skills text[], linkedin_url text, hours_available_per_week smallint,
  bio text, similarity float, score float, has_done boolean
)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  select p.id, p.full_name, p.headline, p.role_type, p.skills, p.linkedin_url,
    p.hours_available_per_week, p.bio,
    (1 - (p.embedding <=> query_embedding))::float as similarity,
    ((1 - (p.embedding <=> query_embedding))
      + case when p_category is not null and p.can_help_with @> array[p_category] then 0.10 else 0 end
      + case when p_category is not null and p.have_helped_with @> array[p_category] then 0.15 else 0 end
      + case when p_needed_languages <> '{}'::text[] and p.languages && p_needed_languages then 0.05 else 0 end
      + case when p_city is not null and p.city is not null and lower(p.city) = lower(p_city) then 0.03 else 0 end
    )::float as score,
    (p_category is not null and p.have_helped_with @> array[p_category]) as has_done
  from public.profiles p
  where p.embedding is not null
    and (p_required_gender is null or p.gender = p_required_gender)
    and (p_needed_languages = '{}'::text[] or p.languages && p_needed_languages)
    and (1 - (p.embedding <=> query_embedding)) > match_threshold
  order by score desc limit match_count;
end; $$;
