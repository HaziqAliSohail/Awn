-- ============================================================
-- Awn — remove ALL demo seed data created by seed_demo.sql.
-- Run in the Supabase SQL Editor for project "Awn".
--
-- Deleting the demo auth.users cascades to their profiles, and
-- profile deletion cascades to their reports, vouches, blocks, and
-- (via ON DELETE SET NULL) detaches their sprints. We delete the
-- sprints and reports explicitly first so nothing is left dangling.
-- ============================================================

-- reports filed by demo members, or about demo needs
delete from public.reports
where reporter_id::text like 'aaaaaaaa-%'
   or reported_user_id::text like 'aaaaaaaa-%'
   or sprint_id in (select id from public.sprints where creator_id::text like 'aaaaaaaa-%');

-- needs posted by demo members
delete from public.sprints where creator_id::text like 'aaaaaaaa-%';

-- the demo accounts (cascades to public.profiles)
delete from auth.users where id::text like 'aaaaaaaa-%';

-- confirm everything is gone
select
  (select count(*) from auth.users     where id::text like 'aaaaaaaa-%')         as demo_accounts,
  (select count(*) from public.profiles where id::text like 'aaaaaaaa-%')         as demo_profiles,
  (select count(*) from public.sprints  where creator_id::text like 'aaaaaaaa-%') as demo_needs,
  (select count(*) from public.reports  where reporter_id::text like 'aaaaaaaa-%') as demo_reports;
