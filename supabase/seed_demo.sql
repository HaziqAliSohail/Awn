-- ============================================================
-- Awn — DEMO seed data (profiles + needs + reports).
-- Run in the Supabase SQL Editor for project "Awn"
-- (ynnjtahmjkblamtmezxj). Runs as the postgres role.
--
-- NOTE: Supabase locks down auth.users (owned by supabase_auth_admin),
-- so we cannot create login accounts from SQL. Instead the demo
-- members are profile rows with synthetic ids. To allow that, we
-- briefly drop the profiles -> auth.users foreign key, insert, then
-- re-add it as NOT VALID (it still guards real future signups; it
-- just doesn't re-check these demo rows). Demo members can't sign in
-- — they exist to populate names, needs, reports, and the console.
--
-- Everything is tagged for one-step cleanup (seed_demo_teardown.sql):
--   profiles.id LIKE 'aaaaaaaa-%'
-- Safe to re-run: guarded with ON CONFLICT / NOT EXISTS.
-- ============================================================

-- ── 0) drop the profiles -> auth.users FK so we can insert ───
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype  = 'f'
    and confrelid = 'auth.users'::regclass
  limit 1;
  if c is not null then
    execute format('alter table public.profiles drop constraint %I', c);
  end if;
end $$;

-- ── 1) 30 demo profiles ─────────────────────────────────────
with names as (
  select * from unnest(array[
   'Ahmed Khan','Fatima Ali','Yusuf Rahman','Aisha Siddiqui','Bilal Ahmed',
   'Zainab Hussain','Omar Farooq','Maryam Iqbal','Ibrahim Malik','Khadija Noor',
   'Hamza Sheikh','Sumayya Patel','Usman Ghani','Hafsa Karim','Zaid Ansari',
   'Ruqayya Baig','Tariq Mahmood','Amina Yusuf','Salman Raza','Nusrat Jahan',
   'Adnan Qureshi','Layla Hakim','Faisal Dar','Sana Mirza','Junaid Aslam',
   'Halima Saeed','Kamran Butt','Rabia Chaudhry','Imran Shah','Zoya Nadeem'
  ]) with ordinality as t(name, n)
)
insert into public.profiles (
  id, full_name, headline, role_type, skills, languages, city,
  can_help_with, have_helped_with, bio
)
select
  ('aaaaaaaa-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  name,
  'Community member in '||(array['Toronto','London','Birmingham','Chicago','Houston','Dearborn','Manchester','New York','Leicester','Ottawa','Bradford','Minneapolis'])[1+(n%12)],
  'professional',
  '{}'::text[],
  array['English'],
  (array['Toronto','London','Birmingham','Chicago','Houston','Dearborn','Manchester','New York','Leicester','Ottawa','Bradford','Minneapolis'])[1+(n%12)],
  (case n % 5
    when 0 then array['meals_food','transport_errands']::domain_category[]
    when 1 then array['home_repairs','moving_labor']::domain_category[]
    when 2 then array['quran_islamic','tutoring_education']::domain_category[]
    when 3 then array['elder_sick_care','health_guidance']::domain_category[]
    else        array['career_resume','tech_digital']::domain_category[]
  end),
  '{}'::domain_category[],
  'Assalamu alaikum. Happy to help the community for the sake of Allah.'
from names
on conflict (id) do nothing;

-- ── 2) 45 needs (sprints) ───────────────────────────────────
with tpl as (
  select * from (values
    ( 1,'janaza',            'Ghusl and janazah help needed this evening', 'Brother passed away, need help with ghusl and janazah arrangements at the masjid tonight', '["Coordinate ghusl volunteers","Arrange janazah timing","Support the family"]', 'urgent',    true),
    ( 2,'meals_food',        'Meals for a family going through hardship',   'A family in the community is going through a hard time and could use some home cooked meals', '["Set up a meal rota","Deliver dinners for five days"]',                     'this_week', true),
    ( 3,'transport_errands', 'Ride to a hospital appointment',              'Elderly uncle needs a ride to his dialysis appointment twice a week',                    '["Confirm the schedule","Provide transport there and back"]',                'scheduled', true),
    ( 4,'home_repairs',      'Leaking kitchen tap needs fixing',            'Widowed sister has a leaking tap and needs someone handy to take a look',                '["Inspect the tap","Replace the washer or cartridge"]',                     'flexible',  true),
    ( 5,'moving_labor',      'Help moving apartments on Saturday',          'Family is relocating and needs a few brothers to help load and unload a van',           '["Load furniture and boxes","Unload at the new place"]',                     'scheduled', true),
    ( 6,'elder_sick_care',   'Weekly check-in for an elderly brother',      'Elderly brother lives alone and would appreciate someone checking in weekly',           '["Weekly friendly visit","Help with small errands"]',                        'flexible',  true),
    ( 7,'childcare_family',  'Childcare during Friday prayer',              'Need childcare help so both parents can attend the Friday prayer',                      '["Watch two young children","Two hours on Friday"]',                          'scheduled', true),
    ( 8,'quran_islamic',     'Quran tajweed lessons for my son',            'Looking for a brother to teach basic tajweed to my nine year old son',                  '["Weekly tajweed lessons","Track his progress"]',                            'flexible',  false),
    ( 9,'tutoring_education','Maths tutoring for a secondary student',      'Daughter needs help with secondary school maths, roughly once a week',                  '["Weekly maths sessions","Help with exam preparation"]',                     'flexible',  false),
    (10,'career_resume',     'CV review for a new graduate',                'Recent graduate would appreciate help polishing a CV and LinkedIn profile',             '["Review the CV","Suggest concrete improvements"]',                          'flexible',  false),
    (11,'legal_immigration', 'Guidance on spouse visa paperwork',           'Would value advice from someone who has been through the spouse visa process',          '["Explain the overall process","Review the documents"]',                     'this_week', false),
    (12,'health_guidance',   'Help understanding a medical report',         'Would appreciate a brother or sister in healthcare to help explain some test results',  '["Explain the report in plain terms","Suggest questions for the doctor"]',   'this_week', false),
    (13,'tech_digital',      'Simple website for a small musalla',          'Local musalla needs a simple one page website showing the prayer timetable',            '["Build a one page site","Add the prayer timetable"]',                        'flexible',  false),
    (14,'masjid_events',     'Volunteers for a community iftar',            'Organising a community iftar and need help with serving and cleanup',                   '["Help serve the food","Setup and cleanup"]',                                'scheduled', true),
    (15,'other',             'Help drafting a letter to the council',       'Need help drafting a formal letter to the council about a housing issue',               '["Draft the letter","Proofread the final version"]',                          'flexible',  false)
  ) as v(i, dom, title, raw_input, deliverables, timing, in_person)
),
grid as (
  select t.*, c.copy, (t.i + 15*c.copy) as n
  from tpl t cross join generate_series(0,2) as c(copy)
)
insert into public.sprints (
  creator_id, requester_kind, raw_input, title, domain, deliverables,
  timing, in_person, city, estimated_hours, required_gender,
  status, flagged, flag_reason, created_at
)
select
  ('aaaaaaaa-0000-4000-8000-'||lpad((1+(n%30))::text,12,'0'))::uuid,
  'individual',
  raw_input,
  title,
  dom::domain_category,
  deliverables::jsonb,
  timing::help_timing,
  in_person,
  (array[
    'Teaneck','Paterson','Jersey City','Newark','Passaic','Clifton',
    'Elizabeth','Paramus','Hackensack','Wayne','Fort Lee','Bayonne',
    'Union City','New Brunswick','Edison','Trenton'
  ])[1 + (n % 16)],                               -- random NJ town
  1 + (n % 12),                                   -- 1..12 estimated hours
  (case dom
     when 'janaza'           then 'male'::gender  -- Brothers only
     when 'childcare_family' then 'female'::gender -- Sisters only
     else null::gender
   end),
  (case
     when n % 11 = 0 then 'completed'
     when n % 7  = 0 then 'claimed'
     when n % 13 = 0 then 'cancelled'
     else 'open'
   end)::sprint_status,
  (n % 8 = 3),
  (case when n % 8 = 3
        then 'Auto-screen: mentions off-platform contact or payment; flagged for a human to review.'
        else null end),
  now() - (n || ' hours')::interval
from grid
where not exists (
  select 1 from public.sprints s
  where s.title = grid.title
    and s.creator_id = ('aaaaaaaa-0000-4000-8000-'||lpad((1+(grid.n%30))::text,12,'0'))::uuid
);

-- ── 3) 14 open reports (populate the moderation queue) ───────
insert into public.reports (reporter_id, reported_user_id, sprint_id, reason, detail, status, created_at)
select
  ('aaaaaaaa-0000-4000-8000-'||lpad((1+((g*3)%30))::text,12,'0'))::uuid as reporter_id,
  case when g % 2 = 0
       then ('aaaaaaaa-0000-4000-8000-'||lpad((1+((g*7)%30))::text,12,'0'))::uuid
       else null end as reported_user_id,
  case when g % 2 = 1
       then (select s.id from public.sprints s
             where s.creator_id::text like 'aaaaaaaa-%'
             order by s.created_at offset (g % 30) limit 1)
       else null end as sprint_id,
  (array['spam','harassment','scam','inappropriate','safety','other'])[1+(g%6)]::report_reason,
  (array[
    'This looks like a scam, they asked me to pay upfront.',
    'Rude and pushy messages after I offered to help.',
    'Posting the same request many times, seems like spam.',
    'Content does not feel appropriate for the community.',
    'I am worried about a safeguarding issue here.',
    'Not sure this is a genuine request.'
  ])[1+(g%6)],
  'open',
  now() - (g || ' hours')::interval
from generate_series(1,14) as g
where not exists (select 1 from public.reports r where r.reporter_id::text like 'aaaaaaaa-%');

-- ── 4) suspend 2 demo members (populate the suspended list) ──
update public.profiles
set suspended = true
where id in (
  ('aaaaaaaa-0000-4000-8000-'||lpad('13',12,'0'))::uuid,
  ('aaaaaaaa-0000-4000-8000-'||lpad('27',12,'0'))::uuid
);

-- ── 5) re-add the FK as NOT VALID (guards future real signups) ─
do $$
begin
  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade not valid;
exception
  when insufficient_privilege then
    raise notice 'Could not re-add profiles->auth.users FK (insufficient privilege). Demo data is inserted; re-add the constraint manually later if you want it back.';
  when duplicate_object then null;
end $$;

-- ── summary ─────────────────────────────────────────────────
select
  (select count(*) from public.profiles where id::text like 'aaaaaaaa-%')          as demo_profiles,
  (select count(*) from public.sprints  where creator_id::text like 'aaaaaaaa-%')  as demo_needs,
  (select count(*) from public.sprints  where creator_id::text like 'aaaaaaaa-%' and flagged) as flagged_needs,
  (select count(*) from public.reports  where reporter_id::text like 'aaaaaaaa-%') as demo_reports,
  (select count(*) from public.profiles where id::text like 'aaaaaaaa-%' and suspended) as suspended_members;
