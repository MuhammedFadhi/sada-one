-- ============================================================
-- SA'DA ONE — 040  Group chat: make groups actually work
--
-- CONFIRMED LIVE: a non-admin can create a channel but gets 403 when
-- adding members — including adding THEMSELVES. Migration 010 fixed
-- this but was never applied to this database.
--
-- Consequences, all of which look like separate bugs:
--   • a new group ends up with zero members
--   • it never appears in your list (the list shows groups you're IN)
--     → "I created several groups but only one shows up"
--   • nobody can be @tagged, because the group has no members
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- Any employee may create a channel they own ─────────────────
DROP POLICY IF EXISTS "channels_insert" ON chat_channels;
CREATE POLICY "channels_insert" ON chat_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = current_employee_id());

-- The owner (or an admin) may rename / archive their group ───
DROP POLICY IF EXISTS "channels_update" ON chat_channels;
CREATE POLICY "channels_update" ON chat_channels FOR UPDATE TO authenticated
  USING (created_by = current_employee_id() OR current_user_role() = 'admin');

-- Membership: add yourself, or anyone to a group you created.
-- NOTE: the original policy was `FOR ALL ... USING (...)` with no
-- WITH CHECK. Postgres then reuses USING as the insert check, so
-- "employee_id = me" silently blocked adding anybody else.
DROP POLICY IF EXISTS "channel_members_write"  ON chat_channel_members;
DROP POLICY IF EXISTS "channel_members_insert" ON chat_channel_members;
DROP POLICY IF EXISTS "channel_members_delete" ON chat_channel_members;
DROP POLICY IF EXISTS "channel_members_update" ON chat_channel_members;

CREATE POLICY "channel_members_insert" ON chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = current_employee_id()
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );

CREATE POLICY "channel_members_delete" ON chat_channel_members FOR DELETE TO authenticated
  USING (
    employee_id = current_employee_id()          -- leave a group
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );

CREATE POLICY "channel_members_update" ON chat_channel_members FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()          -- mark as read
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );

-- Tidy up: groups stranded with no members by the old policy are
-- invisible to everyone and unreachable. Give them back to their creator.
INSERT INTO chat_channel_members (channel_id, employee_id, is_admin)
SELECT c.id, c.created_by, TRUE
FROM chat_channels c
WHERE c.type <> 'direct'
  AND NOT EXISTS (SELECT 1 FROM chat_channel_members m WHERE m.channel_id = c.id)
ON CONFLICT DO NOTHING;

-- ── SUCCESS CHECK ────────────────────────────────────────────
SELECT '040 applied ✓'                                                     AS status,
       (SELECT count(*) FROM pg_policies
          WHERE tablename='chat_channel_members'
            AND policyname IN ('channel_members_insert','channel_members_delete','channel_members_update')) AS member_policies, -- 3
       (SELECT count(*) FROM chat_channels WHERE type <> 'direct')          AS groups_total,
       (SELECT count(*) FROM chat_channels c WHERE c.type <> 'direct'
          AND NOT EXISTS (SELECT 1 FROM chat_channel_members m WHERE m.channel_id=c.id)) AS groups_with_no_members; -- 0
