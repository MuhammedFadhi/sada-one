-- ============================================================
-- SA'DA ONE — Migration 012: Reset chat_channels policies
-- Symptom (confirmed live): an employee can create a PUBLIC channel
-- but a PRIVATE one returns 42501 — a leftover RESTRICTIVE policy
-- gates private channels to admins and survived earlier migrations
-- because it has an unknown name. This drops EVERY policy on
-- chat_channels (any name) and rebuilds a clean permissive set.
-- Safe to re-run.
-- ============================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.chat_channels'::regclass LOOP
    EXECUTE format('DROP POLICY %I ON public.chat_channels', r.polname);
  END LOOP;
END $$;

-- SELECT — public channels, your memberships, or admin
CREATE POLICY "channels_select" ON chat_channels FOR SELECT TO authenticated
  USING (
    type = 'public'
    OR created_by = current_employee_id()
    OR is_channel_member(id, current_employee_id())
    OR current_user_role() = 'admin'
  );

-- INSERT — any employee may create a channel they own (public OR private)
CREATE POLICY "channels_insert" ON chat_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = current_employee_id());

-- UPDATE — creator or admin
CREATE POLICY "channels_update" ON chat_channels FOR UPDATE TO authenticated
  USING (created_by = current_employee_id() OR current_user_role() = 'admin')
  WITH CHECK (created_by = current_employee_id() OR current_user_role() = 'admin');

-- DELETE — creator or admin
CREATE POLICY "channels_delete" ON chat_channels FOR DELETE TO authenticated
  USING (created_by = current_employee_id() OR current_user_role() = 'admin');
