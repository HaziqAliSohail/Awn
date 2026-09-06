-- Profiles table: stores talent and org lead information
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null check (char_length(full_name) >= 2),
  headline text not null,
  role_type profile_role not null default 'professional',
  skills text[] default '{}'::text[] not null,
  linkedin_url text,
  hours_available_per_week smallint default 3 check (hours_available_per_week >= 0),
  bio text,
  embedding vector(1536),
  created_at timestamptz default clock_timestamp() not null,
  updated_at timestamptz default clock_timestamp() not null
);

-- HNSW vector index for cosine similarity search on profiles
create index idx_profiles_embedding
  on public.profiles
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
