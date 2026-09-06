-- ============================================================
-- Patch the demo needs so cards show a real NJ town, varied
-- estimated hours, and a gender tag on a few. Scoped to demo rows
-- only (creator LIKE 'aaaaaaaa-%') — never touches your real needs.
--
-- NOTE: the "Help others" feed defaults to your profile's town
-- (exact, case-insensitive match). Needs whose town matches your
-- profile city show there; the rest appear under the "All" filter.
-- Teaneck is included, so an account based in Teaneck sees several.
-- ============================================================

update public.sprints s
set
  city = (array[
    'Teaneck','Paterson','Jersey City','Newark','Passaic','Clifton',
    'Elizabeth','Paramus','Hackensack','Wayne','Fort Lee','Bayonne',
    'Union City','New Brunswick','Edison','Trenton'
  ])[1 + (abs(hashtext(s.id::text)) % 16)],
  estimated_hours = 1 + (abs(hashtext(s.id::text || 'h')) % 12),  -- 1..12, varies per need
  required_gender = case s.domain
                      when 'janaza'           then 'male'::gender    -- Brothers only
                      when 'childcare_family' then 'female'::gender   -- Sisters only
                      else s.required_gender
                    end
where s.creator_id::text like 'aaaaaaaa-%';

select
  count(*)                                            as demo_needs,
  count(distinct city)                                as distinct_towns,
  count(*) filter (where city = 'Teaneck')            as in_teaneck,
  min(estimated_hours) || '-' || max(estimated_hours) as hours_range,
  count(*) filter (where required_gender is not null) as with_gender
from public.sprints
where creator_id::text like 'aaaaaaaa-%';
