-- ============================================================
-- SA'DA ONE — Migration 014: Let creators see their own channel
-- ROOT CAUSE of "can't create private/group channels":
-- the INSERT succeeds, but supabase-js does .insert().select(), and
-- channels_select only allowed (public OR member OR admin). A brand
-- new private channel's creator is not a member row yet, so the
-- read-back is denied and the whole call reports as an RLS failure
-- (42501). Public channels read back fine, which is why only private
-- broke. Adding created_by fixes it. Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS "channels_select" ON chat_channels;

CREATE POLICY "channels_select" ON chat_channels FOR SELECT TO authenticated
  USING (
    type = 'public'
    OR created_by = current_employee_id()
    OR is_channel_member(id, current_employee_id())
    OR current_user_role() = 'admin'
  );
