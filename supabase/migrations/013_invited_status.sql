-- ============================================================
-- Symmetric connections: a request can be initiated by the HELPER
-- (claim → 'matched') OR by the REQUESTER inviting a chosen helper
-- ('invited'). Kept in its own migration because a new enum value
-- cannot be used in the same transaction that adds it.
-- ============================================================

alter type handshake_status add value if not exists 'invited';
