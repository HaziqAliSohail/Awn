-- ============================================================
-- Awn — remove ALL demo seed data created by seed_demo.sql.
-- Run in the Supabase SQL Editor for project "Awn".
--
-- The demo never created auth.users rows (Supabase blocks that), so
-- there's nothing to remove there. We just delete the tagged rows in
-- public.* — reports first, then their needs, then the profiles.
-- ============================================================

-- reports filed by demo members, or about demo members / demo needs
delete from public.reports
where reporter_id::text like 'aaaaaaaa-%'
   or reported_user_id::text like 'aaaaaaaa-%'
   or sprint_id in (select id from public.sprints where creator_id::text like 'aaaaaaaa-%');

-- needs posted by demo members
delete from public.sprints where creator_id::text like 'aaaaaaaa-%';

-- the demo profiles
delete from public.profiles where id::text like 'aaaaaaaa-%';

-- confirm everything is gone
select
  (select count(*) from public.profiles where id::text like 'aaaaaaaa-%')         as demo_profiles,
  (select count(*) from public.sprints  where creator_id::text like 'aaaaaaaa-%') as demo_needs,
  (select count(*) from public.reports  where reporter_id::text like 'aaaaaaaa-%') as demo_reports;
