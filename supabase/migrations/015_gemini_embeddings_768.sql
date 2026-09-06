-- ============================================================
-- Switch embeddings from OpenAI (1536-dim) to Google Gemini
-- text-embedding-004 (768-dim). The tables are empty, so we drop
-- and recreate the vector columns + HNSW indexes cleanly, and make
-- the match RPC dimension-agnostic (param typed `vector`, no typmod)
-- so future provider swaps don't require another migration.
-- ============================================================

drop index if exists idx_profiles_embedding;
drop index if exists idx_sprints_embedding;

alter table public.profiles drop column if exists embedding;
alter table public.profiles add column embedding vector(768);

alter table public.sprints drop column if exists embedding;
alter table public.sprints add column embedding vector(768);

create index idx_profiles_embedding
  on public.profiles using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
create index idx_sprints_embedding
  on public.sprints using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);

-- Recreate the matcher with a dimension-agnostic embedding param.
drop function if exists public.match_professionals(vector, double precision, integer, gender, text[], text);

create or replace function public.match_professionals(
  query_embedding   vector,
  match_threshold   float default 0.45,
  match_count       int default 3,
  p_required_gender gender default null,
  p_needed_languages text[] default '{}'::text[],
  p_city            text default null
)
returns table (
  id uuid, full_name text, headline text, role_type profile_role,
  skills text[], linkedin_url text, hours_available_per_week smallint,
  bio text, similarity float, score float
)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  select p.id, p.full_name, p.headline, p.role_type, p.skills, p.linkedin_url,
    p.hours_available_per_week, p.bio,
    (1 - (p.embedding <=> query_embedding))::float as similarity,
    ((1 - (p.embedding <=> query_embedding))
      + case when p_needed_languages <> '{}'::text[] and p.languages && p_needed_languages then 0.05 else 0 end
      + case when p_city is not null and p.city is not null and lower(p.city) = lower(p_city) then 0.03 else 0 end)::float as score
  from public.profiles p
  where p.embedding is not null and p.role_type in ('professional', 'student')
    and (p_required_gender is null or p.gender = p_required_gender)
    and (p_needed_languages = '{}'::text[] or p.languages && p_needed_languages)
    and (1 - (p.embedding <=> query_embedding)) > match_threshold
  order by score desc limit match_count;
end; $$;
