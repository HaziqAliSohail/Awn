-- ============================================================
-- Phase 1 genericization: broaden the domain taxonomy so Awn
-- serves the whole ummah's advisory/knowledge needs, not just
-- tech. Additive (ALTER TYPE ADD VALUE) so existing rows and the
-- original tech domains are preserved. Kept in its own migration
-- because a newly added enum value cannot be *used* in the same
-- transaction that adds it.
--
-- Deferred to Phase 2 (needs in-person safeguarding): events_logistics,
-- relief_social, trades_facilities.
-- ============================================================

alter type domain_category add value if not exists 'islamic_knowledge';
alter type domain_category add value if not exists 'education_tutoring';
alter type domain_category add value if not exists 'health_wellbeing';
alter type domain_category add value if not exists 'legal_immigration';
