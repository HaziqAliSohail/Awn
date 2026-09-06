-- ============================================================
-- Close a connection's chat once the requester marks the help
-- completed. History stays readable (SELECT still allows
-- 'accepted' and 'completed'), but no NEW messages can be sent
-- after completion — enforced at the database, not just the UI.
--
-- Note: the optional thank-you note the requester types when
-- completing is inserted BEFORE the status flips to 'completed',
-- so it still lands under the 'accepted' rule below.
-- ============================================================

drop policy if exists "Participants can send connection messages" on public.messages;

create policy "Participants can send connection messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.sprint_handshakes h
      join public.sprints s on s.id = h.sprint_id
      where h.id = messages.handshake_id
        and h.status = 'accepted'   -- was ('accepted','completed'); chat closes on complete
        and (auth.uid() = h.contributor_id or auth.uid() = s.creator_id)
    )
  );
