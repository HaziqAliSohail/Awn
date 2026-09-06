-- match_professionals: Semantic similarity search RPC
-- Finds the best-matching professionals for a given sprint embedding
create or replace function public.match_professionals(
  query_embedding vector(1536),
  match_threshold float default 0.45,
  match_count int default 3
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
  similarity float
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
    1 - (p.embedding <=> query_embedding) as similarity
  from public.profiles p
  where
    p.embedding is not null
    and p.role_type in ('professional', 'student')
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
