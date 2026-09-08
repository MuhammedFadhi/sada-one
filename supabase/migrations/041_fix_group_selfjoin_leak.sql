-- ============================================================
-- SA'DA ONE — 041  Close the group self-join leak
--
-- FOUND BY LIVE TEST: any authenticated user could insert THEMSELVES
-- into ANY channel — including a private group they were never invited
-- to — and thereby read every message in it. Verified: employee1 added
-- themselves to a private group owned by manager1 and got HTTP 201.
--
-- Cause: 040's insert policy allowed `employee_id = current_employee_id()`
-- unconditionally. That clause was there so a group's creator could join
-- the group they had just made — a brand-new private channel is not yet
-- visible to its own creator, so the EXISTS(...) check on chat_channels
-- failed for them.
--
-- Fix: do the creator/public lookups through SECURITY DEFINER helpers,
-- which bypass RLS and therefore work on a brand-new channel. Self-join
-- is then restricted to PUBLIC channels only.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- Bypasses RLS deliberately: a brand-new private channel is invisible to
-- its own creator until they are a member, so a plain EXISTS would fail.
CREATE OR REPLACE FUNCTION is_channel_creator(p_channel UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = p_channel AND c.created_by = current_employee_id()
  );
$$;

-- 'announcement' covers the company-wide #general channel, which staff must
-- still be able to join themselves. Verified against live data before shipping:
-- general = announcement, khobar-operations/erp = public, the rest = private.
CREATE OR REPLACE FUNCTION is_channel_public(p_channel UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = p_channel AND c.type IN ('public', 'announcement')
  );
$$;

REVOKE ALL ON FUNCTION is_channel_creator(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_channel_public(UUID)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_channel_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_channel_public(UUID)  TO authenticated;


DROP POLICY IF EXISTS "channel_members_insert" ON chat_channel_members;
CREATE POLICY "channel_members_insert" ON chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() = 'admin'
    OR is_channel_creator(channel_id)                                    -- creator manages the member list
    OR (employee_id = current_employee_id() AND is_channel_public(channel_id))  -- self-join PUBLIC only
  );

DROP POLICY IF EXISTS "channel_members_delete" ON chat_channel_members;
CREATE POLICY "channel_members_delete" ON chat_channel_members FOR DELETE TO authenticated
  USING (
    employee_id = current_employee_id()        -- you may always leave a group
    OR current_user_role() = 'admin'
    OR is_channel_creator(channel_id)
  );

DROP POLICY IF EXISTS "channel_members_update" ON chat_channel_members;
CREATE POLICY "channel_members_update" ON chat_channel_members FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()        -- marking your own read position
    OR current_user_role() = 'admin'
    OR is_channel_creator(channel_id)
  );


-- ── SUCCESS CHECK ────────────────────────────────────────────
SELECT '041 applied ✓'                                                    AS status,
       (SELECT count(*) FROM pg_proc
          WHERE proname IN ('is_channel_creator','is_channel_public'))     AS helpers,          -- 2
       (SELECT count(*) FROM pg_policies
          WHERE tablename='chat_channel_members'
            AND policyname IN ('channel_members_insert','channel_members_delete','channel_members_update')) AS policies, -- 3
       (SELECT count(*) FROM chat_channels WHERE type IN ('public','announcement')) AS joinable_channels,
       (SELECT count(*) FROM chat_channels WHERE type <> 'direct')         AS groups_total;
