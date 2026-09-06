-- ============================================================
-- Awn is person-to-person ta'āwun, not only institutional capacity.
-- A need may be posted by an individual community member OR on behalf
-- of an organization. Org attribution becomes optional.
-- ============================================================

create type requester_kind as enum ('individual', 'organization');

alter table public.sprints
  add column if not exists requester_kind requester_kind not null default 'individual';

-- Org attribution is now optional (only set when requester_kind = 'organization').
alter table public.sprints alter column org_name drop not null;
alter table public.sprints alter column org_type drop not null;
