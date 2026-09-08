-- ============================================================
-- SA'DA ONE — Migration 010: Chat creation policies
-- Bug (confirmed live): a non-admin employee gets 42501 when
-- creating a channel, even with created_by = current_employee_id().
-- The live channels_insert policy is effectively admin-only and the
-- member-write policy only lets you add YOURSELF — so an employee
-- can't create a group and add others. This recreates both cleanly.
-- Safe to re-run.
-- ============================================================

-- Any authenticated employee may create a channel they own ──────
DROP POLICY IF EXISTS "channels_insert" ON chat_channels;
CREATE POLICY "channels_insert" ON chat_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = current_employee_id());

-- Members: you can add yourself, the channel CREATOR can add anyone
-- to their channel, and admins can manage any membership ─────────
DROP POLICY IF EXISTS "channel_members_write" ON chat_channel_members;
DROP POLICY IF EXISTS "channel_members_insert" ON chat_channel_members;
DROP POLICY IF EXISTS "channel_members_delete" ON chat_channel_members;

CREATE POLICY "channel_members_insert" ON chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = current_employee_id()
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );

CREATE POLICY "channel_members_delete" ON chat_channel_members FOR DELETE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );

CREATE POLICY "channel_members_update" ON chat_channel_members FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.created_by = current_employee_id())
  );
