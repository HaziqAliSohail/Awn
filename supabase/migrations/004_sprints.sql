-- Sprints table: stores AI-scoped micro-sprint tasks
create table public.sprints (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete set null,
  org_name text not null,
  org_type text not null,
  raw_input text not null,
  title text not null,
  domain domain_category not null,
  deliverables jsonb not null check (jsonb_typeof(deliverables) = 'array'),
  prerequisites text[] default '{}'::text[],
  estimated_hours smallint not null check (estimated_hours between 2 and 12),
  status sprint_status default 'open' not null,
  embedding vector(1536),
  created_at timestamptz default clock_timestamp() not null,
  updated_at timestamptz default clock_timestamp() not null
);

-- HNSW vector index for cosine similarity search on sprints
create index idx_sprints_embedding
  on public.sprints
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
